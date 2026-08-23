import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import type { RequestUser } from '../../common/types/auth.types';
import { BroadcastsService } from '../communication/broadcasts.service';
import {
  CreateAssignmentDto,
  GradeSubmissionDto,
  QueryAssignmentsDto,
  SubmitAssignmentDto,
  UpdateAssignmentDto,
} from './dto/assignment.dto';

const ASSIGNMENT_INCLUDE = {
  classSubject: { include: { subject: true, class: true } },
  createdBy: { select: { firstName: true, lastName: true } },
} as const;

const SUBMISSION_INCLUDE = {
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNumber: true,
    },
  },
  gradedBy: { select: { firstName: true, lastName: true } },
} as const;

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly broadcasts: BroadcastsService,
  ) {}

  private async currentTermOrThrow() {
    const term = await this.prisma.term.findFirst({
      where: { isCurrent: true },
    });
    if (!term) throw new BadRequestException('No current term is set');
    return term;
  }

  /** Same TeacherAssignment check as Lesson Notes / Scores — never trust the body. */
  private async assertAssigned(
    staffId: string,
    classSubjectId: string,
    termId: string,
  ): Promise<void> {
    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: { staffId, classSubjectId, termId },
    });
    if (!assignment) {
      throw new ForbiddenException(
        'You are not assigned to teach this class/subject this term',
      );
    }
  }

  async create(dto: CreateAssignmentDto, user: RequestUser) {
    const term = await this.currentTermOrThrow();
    await this.assertAssigned(user.id, dto.classSubjectId, term.id);

    const dueDate = new Date(dto.dueDate);
    if (dueDate.getTime() < Date.now()) {
      throw new BadRequestException('The due date is already in the past');
    }

    const assignment = await this.prisma.assignment.create({
      data: {
        classSubjectId: dto.classSubjectId,
        title: dto.title,
        instructions: dto.instructions,
        dueDate,
        allowLateSubmission: dto.allowLateSubmission ?? false,
        createdByStaffId: user.id,
      },
      include: ASSIGNMENT_INCLUDE,
    });

    // Fire-and-forget — a notification hiccup must not fail the post
    // itself (same stance as the admissions welcome send).
    this.broadcasts
      .sendAssignmentNotice({ assignmentId: assignment.id, kind: 'POSTED' })
      .catch((error: unknown) =>
        this.logger.error(
          `ASSIGNMENT_POSTED notice failed for ${assignment.id}`,
          error instanceof Error ? error.stack : String(error),
        ),
      );

    return assignment;
  }

  /**
   * Role-shaped list (the IncidentsService scoping pattern, not a fourth
   * bespoke one): teachers see what they created; ADMIN/VP everything;
   * a STUDENT their enrolled class's assignments with their own
   * submission attached; a PARENT the same per linked ward.
   */
  async list(query: QueryAssignmentsDto, user: RequestUser) {
    if (user.userType === 'STUDENT') {
      return this.listForStudent(user.id);
    }
    if (user.userType === 'GUARDIAN') {
      return this.listForGuardian(query, user);
    }

    const isUnscoped =
      user.roles.includes('ADMIN') || user.roles.includes('VICE_PRINCIPAL');
    const where: Prisma.AssignmentWhereInput = {
      ...(query.classSubjectId ? { classSubjectId: query.classSubjectId } : {}),
      ...(isUnscoped ? {} : { createdByStaffId: user.id }),
    };
    const assignments = await this.prisma.assignment.findMany({
      where,
      orderBy: { dueDate: 'desc' },
      include: {
        ...ASSIGNMENT_INCLUDE,
        _count: { select: { submissions: true } },
      },
    });
    return assignments.map((a) => ({
      ...a,
      submissionCount: a._count.submissions,
      _count: undefined,
    }));
  }

  private async listForStudent(studentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, status: 'ACTIVE' },
    });
    if (!enrollment) return [];

    const assignments = await this.prisma.assignment.findMany({
      where: { classSubject: { classId: enrollment.classId } },
      orderBy: { dueDate: 'asc' },
      include: {
        ...ASSIGNMENT_INCLUDE,
        submissions: { where: { studentId }, include: SUBMISSION_INCLUDE },
      },
    });
    return assignments.map(({ submissions, ...assignment }) => ({
      ...assignment,
      submission: submissions[0] ?? null,
    }));
  }

  private async listForGuardian(query: QueryAssignmentsDto, user: RequestUser) {
    const links = await this.prisma.studentGuardian.findMany({
      where: { guardianId: user.id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const wardIds = links.map((l) => l.studentId);
    if (wardIds.length === 0) return [];
    if (query.studentId && !wardIds.includes(query.studentId)) {
      throw new ForbiddenException(
        "You can only view your own ward's assignments",
      );
    }
    const targetIds = query.studentId ? [query.studentId] : wardIds;

    type StudentAssignmentRow = Awaited<
      ReturnType<AssignmentsService['listForStudent']>
    >[number];
    const results: (StudentAssignmentRow & {
      student: { id: string; firstName: string; lastName: string };
    })[] = [];
    for (const wardId of targetIds) {
      const ward = links.find((l) => l.studentId === wardId)!.student;
      const wardAssignments = await this.listForStudent(wardId);
      results.push(
        ...wardAssignments.map((a) => ({
          ...a,
          student: ward,
        })),
      );
    }
    return results;
  }

  /** Teacher/Admin view: full submissions list. Student/parent: own (ward's) submission only. */
  async getOrThrow(id: string, user: RequestUser) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: ASSIGNMENT_INCLUDE,
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    if (user.userType === 'STUDENT') {
      await this.assertStudentInClass(user.id, assignment.classSubjectId);
      const submission = await this.prisma.assignmentSubmission.findUnique({
        where: {
          assignmentId_studentId: { assignmentId: id, studentId: user.id },
        },
        include: SUBMISSION_INCLUDE,
      });
      return { ...assignment, submission };
    }

    if (user.userType === 'GUARDIAN') {
      const links = await this.prisma.studentGuardian.findMany({
        where: { guardianId: user.id },
      });
      const wardIds = links.map((l) => l.studentId);
      const submissions = await this.prisma.assignmentSubmission.findMany({
        where: { assignmentId: id, studentId: { in: wardIds } },
        include: SUBMISSION_INCLUDE,
      });
      return { ...assignment, submissions };
    }

    const isUnscoped =
      user.roles.includes('ADMIN') || user.roles.includes('VICE_PRINCIPAL');
    if (!isUnscoped && assignment.createdByStaffId !== user.id) {
      throw new ForbiddenException('You can only view your own assignments');
    }
    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: { assignmentId: id },
      orderBy: { submittedAt: 'asc' },
      include: SUBMISSION_INCLUDE,
    });
    return { ...assignment, submissions };
  }

  async update(id: string, dto: UpdateAssignmentDto, user: RequestUser) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.createdByStaffId !== user.id) {
      throw new ForbiddenException('You can only edit your own assignments');
    }
    if (
      dto.classSubjectId &&
      dto.classSubjectId !== assignment.classSubjectId
    ) {
      const term = await this.currentTermOrThrow();
      await this.assertAssigned(user.id, dto.classSubjectId, term.id);
    }

    return this.prisma.assignment.update({
      where: { id },
      data: {
        ...(dto.classSubjectId !== undefined && {
          classSubjectId: dto.classSubjectId,
        }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.instructions !== undefined && {
          instructions: dto.instructions,
        }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.allowLateSubmission !== undefined && {
          allowLateSubmission: dto.allowLateSubmission,
        }),
      },
      include: ASSIGNMENT_INCLUDE,
    });
  }

  private async assertStudentInClass(
    studentId: string,
    classSubjectId: string,
  ): Promise<void> {
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
    });
    if (!classSubject) throw new NotFoundException('ClassSubject not found');
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, classId: classSubject.classId, status: 'ACTIVE' },
    });
    if (!enrollment) {
      throw new ForbiddenException('This assignment is not for your class');
    }
  }

  /** Shared by text submit and file submit — enrollment + deadline + not-yet-graded checks. */
  private async assertSubmittable(assignmentId: string, studentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.assertStudentInClass(studentId, assignment.classSubjectId);

    if (
      Date.now() > assignment.dueDate.getTime() &&
      !assignment.allowLateSubmission
    ) {
      throw new BadRequestException(
        'The deadline has passed and this assignment does not accept late submissions',
      );
    }

    const existing = await this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });
    if (existing?.gradedAt) {
      throw new BadRequestException(
        'This submission has already been graded and can no longer be changed',
      );
    }
    return assignment;
  }

  async submit(
    assignmentId: string,
    dto: SubmitAssignmentDto,
    user: RequestUser,
  ) {
    await this.assertSubmittable(assignmentId, user.id);
    if (!dto.textResponse?.trim()) {
      throw new BadRequestException(
        'Write a response (file-only submissions go through the file upload endpoint)',
      );
    }

    return this.prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: { assignmentId, studentId: user.id },
      },
      update: {
        textResponse: dto.textResponse.trim(),
        submittedAt: new Date(),
      },
      create: {
        assignmentId,
        studentId: user.id,
        textResponse: dto.textResponse.trim(),
      },
      include: SUBMISSION_INCLUDE,
    });
  }

  async submitFile(
    assignmentId: string,
    file: Express.Multer.File | undefined,
    user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    await this.assertSubmittable(assignmentId, user.id);

    const { url } = await this.storage.upload(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
      'assignment-submissions',
    );

    return this.prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: { assignmentId, studentId: user.id },
      },
      update: { fileUrl: url, submittedAt: new Date() },
      create: { assignmentId, studentId: user.id, fileUrl: url },
      include: SUBMISSION_INCLUDE,
    });
  }

  async grade(
    assignmentId: string,
    submissionId: string,
    dto: GradeSubmissionDto,
    user: RequestUser,
  ) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    // Same ownership check as creation: assigned to teach this classSubject.
    const term = await this.currentTermOrThrow();
    await this.assertAssigned(user.id, assignment.classSubjectId, term.id);

    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission || submission.assignmentId !== assignmentId) {
      throw new NotFoundException('Submission not found on this assignment');
    }

    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade: dto.grade,
        feedback: dto.feedback?.trim() || null,
        gradedAt: new Date(),
        gradedByStaffId: user.id,
      },
      include: SUBMISSION_INCLUDE,
    });
  }

  async uploadAttachment(
    id: string,
    file: Express.Multer.File | undefined,
    user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.createdByStaffId !== user.id) {
      throw new ForbiddenException(
        'You can only attach files to your own assignments',
      );
    }

    const { url } = await this.storage.upload(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
      'assignment-attachments',
    );

    return this.prisma.assignment.update({
      where: { id },
      data: { attachmentUrl: url },
      include: ASSIGNMENT_INCLUDE,
    });
  }
}
