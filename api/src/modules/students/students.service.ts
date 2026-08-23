import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Enrollment, Student } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { ADMISSION_NUMBER_LOCK_KEY } from '../../common/utils/admission-number-lock';
import { assertEmailAvailableAcrossUserTypes } from '../../common/utils/assert-email-available';
import { generateTempPassword } from '../../common/utils/generate-temp-password';
import { translatePrismaError } from '../../common/utils/prisma-error';
import type { RequestUser } from '../../common/types/auth.types';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { LinkGuardianDto } from './dto/link-guardian.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface StudentDocumentEntry {
  id: string;
  type: string;
  url: string;
  uploadedAt: string;
}

const BCRYPT_ROUNDS = 10;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
// Testimonials/certificates/medical forms are scans or exports — never a
// reason to accept arbitrary file types (e.g. .html/.svg/.exe), which would
// otherwise sit unvalidated in object storage and be served back via a
// direct link from documents-tab.tsx.
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ACTIVE_ENROLLMENT_INCLUDE = {
  where: { status: 'ACTIVE' as const },
  take: 1,
  include: { class: true, arm: true, term: { include: { session: true } } },
};

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ---------------------------------------------------------------------
  // Core CRUD
  // ---------------------------------------------------------------------

  async createStudent(
    dto: CreateStudentDto,
  ): Promise<Student & { temporaryPassword?: string }> {
    this.assertPlausibleDateOfBirth(dto.dateOfBirth);

    let passwordHash: string | undefined;
    let temporaryPassword: string | undefined;
    if (dto.email) {
      await assertEmailAvailableAcrossUserTypes(
        this.prisma,
        dto.email,
        'STUDENT',
      );
      temporaryPassword = dto.password ?? generateTempPassword();
      passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    }

    return this.prisma.$transaction(async (tx) => {
      // Holds the advisory lock for the rest of this transaction —
      // concurrent createStudent calls queue here instead of both reading
      // the same "current max sequence" and colliding on the unique
      // constraint. Released automatically on commit/rollback.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADMISSION_NUMBER_LOCK_KEY})`;
      const admissionNumber = await this.generateAdmissionNumber(tx);

      try {
        const student = await tx.student.create({
          data: {
            admissionNumber,
            firstName: dto.firstName,
            lastName: dto.lastName,
            dateOfBirth: new Date(dto.dateOfBirth),
            gender: dto.gender,
            stateOfOrigin: dto.stateOfOrigin,
            lga: dto.lga,
            religion: dto.religion,
            bloodGroup: dto.bloodGroup,
            genotype: dto.genotype,
            address: dto.address,
            email: dto.email,
            passwordHash,
            // Stage 29 digital ID — a long random opaque token (not the
            // admission number, which is guessable/sequential), encoded
            // as a QR code and resolved back via GET /students/qr/:qrToken.
            qrToken: randomUUID(),
          },
        });
        return {
          ...student,
          ...(dto.email && !dto.password ? { temporaryPassword } : {}),
        };
      } catch (error) {
        translatePrismaError(error, 'A student with this email already exists');
      }
    });
  }

  async listStudents(
    query: QueryStudentsDto,
    user: RequestUser,
  ): Promise<{
    data: Student[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const scope = await this.getScopeWhere(user);
    if (scope === 'NONE') {
      return {
        data: [],
        total: 0,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
      };
    }

    const enrollmentFilter: Prisma.EnrollmentWhereInput = {};
    if (query.classId) enrollmentFilter.classId = query.classId;
    if (query.armId) enrollmentFilter.armId = query.armId;
    if (query.status) enrollmentFilter.status = query.status;
    if (query.sessionId) enrollmentFilter.term = { sessionId: query.sessionId };

    // Combined via AND (never object-spread into one literal) — the
    // CLASS_TEACHER/SUBJECT_TEACHER scope shapes also key off `enrollments`,
    // and spreading two objects that both set the same key means whichever
    // is spread last silently wins, discarding the other. AND keeps the
    // caller's filters (classId/armId/status/search) and the role's scope
    // both genuinely enforced together, not one clobbering the other.
    const conditions: Prisma.StudentWhereInput[] = [
      { isActive: query.includeInactive ? undefined : true },
    ];
    if (Object.keys(enrollmentFilter).length > 0) {
      conditions.push({ enrollments: { some: enrollmentFilter } });
    }
    if (query.search) {
      conditions.push({
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { admissionNumber: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }
    if (scope !== 'ALL') {
      conditions.push(scope);
    }
    const where: Prisma.StudentWhereInput = { AND: conditions };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: { enrollments: ACTIVE_ENROLLMENT_INCLUDE },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.student.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async getStudent(id: string, user: RequestUser): Promise<Student> {
    await this.assertStudentInScope(id, user);

    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: ACTIVE_ENROLLMENT_INCLUDE,
        guardians: { include: { guardian: true } },
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  /**
   * 404s (not 403) when the student exists but is outside the caller's
   * scope, to avoid confirming the id exists to unauthorized viewers.
   *
   * CRITICAL: combine via `AND: [{ id }, scope]`, never `{ id, ...scope }`
   * — the STUDENT/PARENT branches of getScopeWhere() return a scope shaped
   * like `{ id: <self> }`, and spreading that after the literal `id` key
   * silently overwrites it (last-key-wins in object literals), turning
   * this into "does *my own* id exist" — true for any authenticated
   * student/parent regardless of which id was actually requested. That
   * shipped as a real bug: any student or parent could view any other
   * student's full record by id.
   */
  private async assertStudentInScope(
    id: string,
    user: RequestUser,
  ): Promise<void> {
    const scope = await this.getScopeWhere(user);
    if (scope === 'NONE') {
      throw new NotFoundException('Student not found');
    }
    if (scope === 'ALL') {
      return;
    }
    const match = await this.prisma.student.findFirst({
      where: { AND: [{ id }, scope] },
    });
    if (!match) {
      throw new NotFoundException('Student not found');
    }
  }

  // Fields a student may change on their own record (Stage 15 profile
  // page). Everything else — name, DOB, email, enrollment — stays
  // Admin-managed.
  private static readonly STUDENT_SELF_EDITABLE_FIELDS = ['address'] as const;

  async updateStudent(
    id: string,
    dto: UpdateStudentDto,
    user: RequestUser,
  ): Promise<Student> {
    if (user.userType === 'STUDENT') {
      if (user.id !== id) {
        throw new ForbiddenException('You can only update your own profile');
      }
      const disallowed = Object.keys(dto).filter(
        (key) =>
          !(
            StudentsService.STUDENT_SELF_EDITABLE_FIELDS as readonly string[]
          ).includes(key),
      );
      if (disallowed.length > 0) {
        throw new ForbiddenException(
          `Students can only update: ${StudentsService.STUDENT_SELF_EDITABLE_FIELDS.join(', ')}`,
        );
      }
    }

    await this.getStudentOrThrow(id);

    if (dto.dateOfBirth !== undefined) {
      this.assertPlausibleDateOfBirth(dto.dateOfBirth);
    }

    if (dto.email !== undefined) {
      await assertEmailAvailableAcrossUserTypes(
        this.prisma,
        dto.email,
        'STUDENT',
      );
    }

    try {
      return await this.prisma.student.update({
        where: { id },
        data: {
          ...(dto.firstName !== undefined && { firstName: dto.firstName }),
          ...(dto.lastName !== undefined && { lastName: dto.lastName }),
          ...(dto.dateOfBirth !== undefined && {
            dateOfBirth: new Date(dto.dateOfBirth),
          }),
          ...(dto.gender !== undefined && { gender: dto.gender }),
          ...(dto.stateOfOrigin !== undefined && {
            stateOfOrigin: dto.stateOfOrigin,
          }),
          ...(dto.lga !== undefined && { lga: dto.lga }),
          ...(dto.religion !== undefined && { religion: dto.religion }),
          ...(dto.bloodGroup !== undefined && { bloodGroup: dto.bloodGroup }),
          ...(dto.genotype !== undefined && { genotype: dto.genotype }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (error) {
      translatePrismaError(error, 'A student with this email already exists');
    }
  }

  /** Soft-delete only — a student's history (scores, attendance, fees in later stages) must never disappear. */
  async softDeleteStudent(id: string): Promise<void> {
    await this.getStudentOrThrow(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.student.update({ where: { id }, data: { isActive: false } });
      await tx.refreshToken.updateMany({
        where: { studentId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      // A deactivated student showing up as ACTIVE-enrolled would corrupt
      // any "currently enrolled" filter/report — withdraw them from
      // whichever enrollment is still open. Reactivating later doesn't
      // restore this automatically; the admin creates a fresh enrollment
      // or adjusts the status explicitly, since "why" they left isn't
      // knowable here (transfer vs. withdrawal vs. error).
      await tx.enrollment.updateMany({
        where: { studentId: id, status: 'ACTIVE' },
        data: { status: 'WITHDRAWN' },
      });
    });
  }

  // ---------------------------------------------------------------------
  // Admission number generation
  // ---------------------------------------------------------------------

  /**
   * Substitutes {year} and {sequence} (zero-padded to 3 digits, matching
   * prisma/seed.ts's convention) into the School's configured format —
   * docs/02-feature-list.md §3 wants this auto-generated but configurable,
   * not hardcoded. The sequence is derived from existing admission numbers
   * matching this year's pattern (max + 1).
   *
   * `client` lets createStudent pass its transaction client (held under
   * an advisory lock — see that method) so this reads under the same lock
   * that'll guard the eventual create; without that serialization, two
   * concurrent calls reading via `this.prisma` directly could both compute
   * the same "next" number — verified to actually happen under real
   * concurrency, not just a theoretical race.
   */
  private async generateAdmissionNumber(
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<string> {
    const school = await client.school.findFirst();
    const format = school?.admissionNumberFormat ?? 'STU{year}{sequence}';
    const year = new Date().getFullYear().toString();

    const escaped = format.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escaped
      .replace('\\{year\\}', year)
      .replace('\\{sequence\\}', '(\\d+)');
    const regex = new RegExp(`^${pattern}$`);

    const existing = await client.student.findMany({
      where: {
        admissionNumber: {
          startsWith: format.split('{sequence}')[0].replace('{year}', year),
        },
      },
      select: { admissionNumber: true },
    });

    let maxSequence = 0;
    for (const { admissionNumber } of existing) {
      const match = regex.exec(admissionNumber);
      if (match) {
        maxSequence = Math.max(maxSequence, parseInt(match[1], 10));
      }
    }

    const nextSequence = (maxSequence + 1).toString().padStart(3, '0');
    return format.replace('{year}', year).replace('{sequence}', nextSequence);
  }

  // ---------------------------------------------------------------------
  // Photo & documents
  // ---------------------------------------------------------------------

  async uploadPhoto(
    id: string,
    file: UploadedFile | undefined,
  ): Promise<Student> {
    await this.getStudentOrThrow(id);
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Photo must be an image file');
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      throw new BadRequestException('Photo must be 5MB or smaller');
    }

    const { url } = await this.storage.upload(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
      'student-photos',
    );

    return this.prisma.student.update({
      where: { id },
      data: { photoUrl: url },
    });
  }

  async uploadDocument(
    id: string,
    type: string,
    file: UploadedFile | undefined,
  ): Promise<Student> {
    const student = await this.getStudentOrThrow(id);
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Document must be a PDF, JPEG, PNG, or WebP file',
      );
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      throw new BadRequestException('Document must be 10MB or smaller');
    }

    const { url } = await this.storage.upload(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
      'student-documents',
    );

    const existing =
      (student.documents as unknown as StudentDocumentEntry[] | null) ?? [];
    const newEntry: StudentDocumentEntry = {
      id: randomUUID(),
      type,
      url,
      uploadedAt: new Date().toISOString(),
    };

    return this.prisma.student.update({
      where: { id },
      data: {
        documents: [...existing, newEntry] as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Guardians
  // ---------------------------------------------------------------------

  async linkGuardian(studentId: string, dto: LinkGuardianDto) {
    await this.getStudentOrThrow(studentId);

    let guardianId = dto.guardianId;
    // Only set when a *new* guardian is created here — returned once so
    // the admin can hand it over, the same as createStaff/createStudent/
    // createGuardian. Linking an existing guardian has no new credential
    // to reveal, so this stays undefined on that path.
    let guardianTemporaryPassword: string | undefined;
    if (!guardianId) {
      if (!dto.firstName || !dto.lastName || !dto.email) {
        throw new BadRequestException(
          'firstName, lastName, and email are required when not linking an existing guardianId',
        );
      }
      await assertEmailAvailableAcrossUserTypes(
        this.prisma,
        dto.email,
        'GUARDIAN',
      );
      const temporaryPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
      try {
        const guardian = await this.prisma.guardian.create({
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            phone: dto.phone,
            passwordHash,
          },
        });
        guardianId = guardian.id;
        guardianTemporaryPassword = temporaryPassword;
      } catch (error) {
        translatePrismaError(
          error,
          'A guardian with this email already exists',
        );
      }
    } else {
      const guardian = await this.prisma.guardian.findUnique({
        where: { id: guardianId },
      });
      if (!guardian) {
        throw new NotFoundException('Guardian not found');
      }
    }

    try {
      const link = await this.prisma.studentGuardian.create({
        data: { studentId, guardianId, relationship: dto.relationship },
        include: { guardian: true },
      });
      return {
        ...link,
        ...(guardianTemporaryPassword ? { guardianTemporaryPassword } : {}),
      };
    } catch (error) {
      translatePrismaError(
        error,
        'This guardian is already linked to this student',
      );
    }
  }

  async unlinkGuardian(studentId: string, guardianId: string): Promise<void> {
    const link = await this.prisma.studentGuardian.findUnique({
      where: { studentId_guardianId: { studentId, guardianId } },
    });
    if (!link) {
      throw new NotFoundException(
        'This guardian is not linked to this student',
      );
    }
    await this.prisma.studentGuardian.delete({ where: { id: link.id } });
  }

  // ---------------------------------------------------------------------
  // Enrollment
  // ---------------------------------------------------------------------

  async listEnrollments(
    studentId: string,
    user: RequestUser,
  ): Promise<Enrollment[]> {
    await this.assertStudentInScope(studentId, user);
    return this.prisma.enrollment.findMany({
      where: { studentId },
      include: { class: true, arm: true, term: { include: { session: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEnrollment(
    studentId: string,
    dto: CreateEnrollmentDto,
  ): Promise<Enrollment> {
    await this.getStudentOrThrow(studentId);

    const status = dto.status ?? 'ACTIVE';
    if (status === 'ACTIVE') {
      const activeEnrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, status: 'ACTIVE' },
      });
      if (activeEnrollment) {
        throw new ConflictException(
          'This student already has an active enrollment — update its status before creating a new active one',
        );
      }
    }

    const arm = await this.prisma.arm.findUnique({ where: { id: dto.armId } });
    if (!arm) {
      throw new BadRequestException('armId does not refer to an existing arm');
    }
    if (arm.classId !== dto.classId) {
      throw new BadRequestException(
        'armId does not belong to the given classId',
      );
    }
    const term = await this.prisma.term.findUnique({
      where: { id: dto.termId },
    });
    if (!term) {
      throw new BadRequestException(
        'termId does not refer to an existing term',
      );
    }

    try {
      return await this.prisma.enrollment.create({
        data: {
          studentId,
          classId: dto.classId,
          armId: dto.armId,
          termId: dto.termId,
          status,
        },
        include: {
          class: true,
          arm: true,
          term: { include: { session: true } },
        },
      });
    } catch (error) {
      translatePrismaError(
        error,
        'This student already has an enrollment for this term',
      );
    }
  }

  async updateEnrollmentStatus(
    studentId: string,
    enrollmentId: string,
    dto: UpdateEnrollmentDto,
  ): Promise<Enrollment> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment || enrollment.studentId !== studentId) {
      throw new NotFoundException('Enrollment not found for this student');
    }

    // createEnrollment() only guards against a second ACTIVE enrollment at
    // creation time — without the same check here, transitioning a
    // different (PROMOTED/WITHDRAWN/etc.) enrollment back to ACTIVE could
    // just as easily leave a student with two simultaneously-active
    // enrollments, which is exactly the invariant this stage's "Done when"
    // required enforcing.
    if (dto.status === 'ACTIVE' && enrollment.status !== 'ACTIVE') {
      const otherActiveEnrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, status: 'ACTIVE', id: { not: enrollmentId } },
      });
      if (otherActiveEnrollment) {
        throw new ConflictException(
          'This student already has a different active enrollment — update that one away from ACTIVE first',
        );
      }
    }

    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: dto.status },
      include: { class: true, arm: true, term: { include: { session: true } } },
    });
  }

  // ---------------------------------------------------------------------
  // Role-based read scoping — docs/03-roles-and-permissions.md §2 "Student
  // records" row. ADMIN/VICE_PRINCIPAL and the plain-"V" roles (HOD,
  // EXAM_OFFICER, BURSAR, LIBRARIAN, HOSTEL_WARDEN, TRANSPORT_OFFICER,
  // FRONT_DESK) see everything for now — their docs-listed qualifiers
  // ("fee-linked", "boarders", "route users") depend on Fee/Hostel/Transport
  // modules that don't exist yet, so they're intentionally unscoped until
  // those stages land. HR_OFFICER gets "–" (no access) per the matrix.
  // CLASS_TEACHER is scoped to their arm(s) (Arm.classTeacherId);
  // SUBJECT_TEACHER to classes they currently teach a subject in. Roles
  // are additive (docs §1) — a user with both a broad and a narrow role
  // gets the broader access, and two narrow roles get the union of both.
  // ---------------------------------------------------------------------

  private readonly UNSCOPED_VIEW_ROLES: RequestUser['roles'] = [
    'ADMIN',
    'VICE_PRINCIPAL',
    'HOD',
    'EXAM_OFFICER',
    'BURSAR',
    'LIBRARIAN',
    'HOSTEL_WARDEN',
    'TRANSPORT_OFFICER',
    'FRONT_DESK',
  ];

  private async getScopeWhere(
    user: RequestUser,
  ): Promise<Prisma.StudentWhereInput | 'ALL' | 'NONE'> {
    if (user.roles.some((role) => this.UNSCOPED_VIEW_ROLES.includes(role))) {
      return 'ALL';
    }

    if (user.roles.includes('STUDENT')) {
      return { id: user.id };
    }

    if (user.roles.includes('PARENT')) {
      const links = await this.prisma.studentGuardian.findMany({
        where: { guardianId: user.id },
        select: { studentId: true },
      });
      if (links.length === 0) return 'NONE';
      return { id: { in: links.map((l) => l.studentId) } };
    }

    const scopedWheres: Prisma.StudentWhereInput[] = [];

    if (user.roles.includes('CLASS_TEACHER')) {
      const arms = await this.prisma.arm.findMany({
        where: { classTeacherId: user.id },
        select: { id: true },
      });
      if (arms.length > 0) {
        scopedWheres.push({
          enrollments: {
            some: { armId: { in: arms.map((a) => a.id) }, status: 'ACTIVE' },
          },
        });
      }
    }

    if (user.roles.includes('SUBJECT_TEACHER')) {
      // Scoped to the *current* term's assignments only — TeacherAssignment
      // rows are per-term, so without this a teacher who taught a class in
      // a past term (and no longer does) would keep seeing those students
      // forever, which is broader than "classes they currently teach".
      const currentTerm = await this.prisma.term.findFirst({
        where: { isCurrent: true },
      });
      const assignments = currentTerm
        ? await this.prisma.teacherAssignment.findMany({
            where: { staffId: user.id, termId: currentTerm.id },
            select: { classSubject: { select: { classId: true } } },
          })
        : [];
      const classIds = [
        ...new Set(assignments.map((a) => a.classSubject.classId)),
      ];
      if (classIds.length > 0) {
        scopedWheres.push({
          enrollments: {
            some: { classId: { in: classIds }, status: 'ACTIVE' },
          },
        });
      }
    }

    // HR_OFFICER (and any role combination that resolved to nothing above)
    // gets no access — fail closed, matching the matrix's "–".
    if (scopedWheres.length === 0) return 'NONE';
    if (scopedWheres.length === 1) return scopedWheres[0];
    return { OR: scopedWheres };
  }

  /**
   * class-validator's @MaxDate() can't be used for "not in the future"
   * here — its argument is evaluated once when the class is defined, not
   * per-request, so it would freeze at whenever the server started rather
   * than the actual current date. bulk-import.service.ts's preview()
   * already checks this per-row; createStudent/updateStudent didn't,
   * which would have silently let a birth date decades in the future
   * through the one-at-a-time admin form.
   */
  private assertPlausibleDateOfBirth(dateOfBirth: string): void {
    if (new Date(dateOfBirth).getTime() > Date.now()) {
      throw new BadRequestException('dateOfBirth cannot be in the future');
    }
  }

  private async getStudentOrThrow(id: string): Promise<Student> {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }
}
