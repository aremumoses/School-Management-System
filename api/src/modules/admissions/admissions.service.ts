import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdmissionFeeTransaction,
  Applicant,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertEmailAvailableAcrossUserTypes } from '../../common/utils/assert-email-available';
import { generateTempPassword } from '../../common/utils/generate-temp-password';
import type { RequestUser } from '../../common/types/auth.types';
import { BroadcastsService } from '../communication/broadcasts.service';
import { PaystackService } from '../payments/paystack.service';
import {
  ApplyDto,
  ConvertApplicantDto,
  QueryApplicantsDto,
  ReviewApplicantDto,
} from './dto/admissions.dto';
import {
  OFFER_LETTERS_QUEUE,
  type OfferLetterJobData,
} from './offer-letter/offer-letter.constants';

const BCRYPT_ROUNDS = 10;
// Prefix distinguishes admissions-fee Paystack references from invoice-payment
// references (PSK-) so the webhook handler can route them correctly.
const ADMISSION_REFERENCE_PREFIX = 'ADMIT-';

@Injectable()
export class AdmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly paystackService: PaystackService,
    private readonly broadcastsService: BroadcastsService,
    @InjectQueue(OFFER_LETTERS_QUEUE)
    private readonly offerLettersQueue: Queue<OfferLetterJobData>,
  ) {}

  /** Public — no authentication required. Validates and creates an Applicant in SUBMITTED status. */
  async apply(dto: ApplyDto): Promise<Applicant> {
    const applicant = await this.prisma.applicant.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        address: dto.address,
        intendedClassLevel: dto.intendedClassLevel,
        guardianFirstName: dto.guardianFirstName,
        guardianLastName: dto.guardianLastName,
        guardianEmail: dto.guardianEmail.toLowerCase(),
        guardianPhone: dto.guardianPhone,
        status: 'SUBMITTED',
      },
    });

    await this.auditLog.write({
      actorId: 'SYSTEM',
      actorType: 'SYSTEM',
      actorRole: '',
      action: 'ADMISSION_SUBMITTED',
      entityType: 'Applicant',
      entityId: applicant.id,
      afterJson: {
        name: `${dto.firstName} ${dto.lastName}`,
        intendedClassLevel: dto.intendedClassLevel,
        guardianEmail: dto.guardianEmail,
      },
    });

    // Notify Admin that a new application has arrived (non-blocking — best-effort)
    this.broadcastsService
      .notifyAdminNewApplication({
        applicantName: `${dto.firstName} ${dto.lastName}`,
        intendedClassLevel: dto.intendedClassLevel,
      })
      .catch(() => undefined);

    return applicant;
  }

  async list(query: QueryApplicantsDto): Promise<Applicant[]> {
    return this.prisma.applicant.findMany({
      where: query.status ? { status: query.status } : undefined,
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getOrThrow(
    id: string,
  ): Promise<Applicant & { feeTransactions: AdmissionFeeTransaction[] }> {
    const applicant = await this.prisma.applicant.findUnique({
      where: { id },
      include: { feeTransactions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!applicant) throw new NotFoundException('Applicant not found');
    return applicant;
  }

  async review(
    id: string,
    dto: ReviewApplicantDto,
    reviewer: RequestUser,
  ): Promise<Applicant> {
    const applicant = await this.getOrThrow(id);
    if (
      applicant.status !== 'SUBMITTED' &&
      applicant.status !== 'UNDER_REVIEW'
    ) {
      throw new BadRequestException(
        `Cannot review an applicant in ${applicant.status} status.`,
      );
    }
    if (dto.decision === 'REJECTED' && !dto.reviewerNotes?.trim()) {
      throw new BadRequestException(
        'Rejection notes are required when declining an application.',
      );
    }

    const updated = await this.prisma.applicant.update({
      where: { id },
      data: {
        status: dto.decision,
        reviewerNotes: dto.reviewerNotes,
        reviewedByStaffId: reviewer.id,
      },
    });

    await this.auditLog.write({
      actorId: reviewer.id,
      actorType: 'STAFF',
      actorRole: reviewer.roles.join(','),
      action: 'ADMISSION_REVIEWED',
      entityType: 'Applicant',
      entityId: id,
      afterJson: { decision: dto.decision, reviewerNotes: dto.reviewerNotes },
    });

    // Generate offer letter PDF on approval (async — don't block the response)
    if (dto.decision === 'APPROVED') {
      await this.offerLettersQueue.add(
        'generate',
        { applicantId: id },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 500 },
          removeOnFail: { count: 2000 },
        },
      );
    }

    return updated;
  }

  /** Initiate a Paystack checkout for the application fee. */
  async initiateApplicationFee(
    id: string,
  ): Promise<{ authorizationUrl: string; reference: string }> {
    const applicant = await this.getOrThrow(id);
    if (applicant.applicationFeePaid) {
      throw new ConflictException('Application fee has already been paid.');
    }

    const school = await this.prisma.school.findFirstOrThrow();
    if (!school.applicationFeeAmount) {
      throw new BadRequestException(
        'No application fee is configured for this school. Contact the Admin.',
      );
    }

    const reference = `${ADMISSION_REFERENCE_PREFIX}${randomUUID()}`;
    const result = await this.paystackService.initializeTransaction({
      email: applicant.guardianEmail,
      amountNaira: school.applicationFeeAmount,
      reference,
    });

    await this.prisma.admissionFeeTransaction.create({
      data: {
        reference,
        amount: school.applicationFeeAmount,
        authorizationUrl: result.authorizationUrl,
        applicantId: id,
      },
    });

    return {
      authorizationUrl: result.authorizationUrl,
      reference: result.reference,
    };
  }

  /**
   * Called by the Paystack webhook handler when a charge.success event
   * arrives for a reference starting with ADMISSION_REFERENCE_PREFIX.
   */
  async handleApplicationFeeWebhook(reference: string): Promise<void> {
    const tx = await this.prisma.admissionFeeTransaction.findUnique({
      where: { reference },
    });
    if (!tx) {
      // Already processed or unknown — log and ignore.
      return;
    }
    if (tx.status === 'SUCCESS') {
      return; // Idempotent
    }

    await this.prisma.$transaction([
      this.prisma.admissionFeeTransaction.update({
        where: { reference },
        data: { status: 'SUCCESS' },
      }),
      this.prisma.applicant.update({
        where: { id: tx.applicantId },
        data: { applicationFeePaid: true },
      }),
    ]);

    await this.auditLog.write({
      actorId: 'SYSTEM',
      actorType: 'SYSTEM',
      actorRole: '',
      action: 'ADMISSION_FEE_PAID',
      entityType: 'Applicant',
      entityId: tx.applicantId,
      afterJson: { reference, amount: tx.amount },
    });
  }

  /**
   * Convert an APPROVED applicant into a real enrolled Student.
   * Creates the Student + initial Enrollment, finds-or-creates the Guardian,
   * and sends the welcome SMS/email with login credentials.
   */
  async convert(
    id: string,
    dto: ConvertApplicantDto,
    actor: RequestUser,
  ): Promise<{ studentId: string; temporaryPassword: string }> {
    const applicant = await this.getOrThrow(id);
    // Idempotency check before status check — a CONVERTED applicant is also
    // "not APPROVED", so this order gives the more specific 409 error rather
    // than a generic 403 that doesn't explain the idempotency situation.
    if (applicant.convertedStudentId) {
      throw new ConflictException('This applicant has already been converted.');
    }
    if (applicant.status !== 'APPROVED') {
      throw new ForbiddenException(
        'Only APPROVED applicants can be converted to students.',
      );
    }

    const currentTerm = await this.prisma.term.findFirst({
      where: { isCurrent: true },
    });
    if (!currentTerm) {
      throw new BadRequestException(
        'No current term is set. Configure a current term before converting applicants.',
      );
    }

    const [arm, klass] = await Promise.all([
      this.prisma.arm.findUnique({ where: { id: dto.armId } }),
      this.prisma.class.findUnique({ where: { id: dto.classId } }),
    ]);
    if (!arm || arm.classId !== dto.classId) {
      throw new BadRequestException(
        'The arm does not belong to the specified class.',
      );
    }
    if (!klass) {
      throw new BadRequestException('Class not found.');
    }

    // Resolve or create the guardian
    const guardianEmail = applicant.guardianEmail.toLowerCase();
    await assertEmailAvailableAcrossUserTypes(
      this.prisma,
      guardianEmail,
      'GUARDIAN',
    );

    const temporaryPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      // Find-or-create guardian (a sibling might already have a portal account)
      let guardian = await tx.guardian.findUnique({
        where: { email: guardianEmail },
      });
      if (!guardian) {
        guardian = await tx.guardian.create({
          data: {
            firstName: applicant.guardianFirstName,
            lastName: applicant.guardianLastName,
            email: guardianEmail,
            phone: applicant.guardianPhone,
            passwordHash,
          },
        });
      }

      // Generate admission number if not supplied
      const admissionNumber =
        dto.admissionNumber ?? (await this.generateAdmissionNumber(tx));

      // Create the student
      const student = await tx.student.create({
        data: {
          firstName: applicant.firstName,
          lastName: applicant.lastName,
          dateOfBirth: applicant.dateOfBirth,
          // Applicant.gender is a freeform string; Student.gender is a
          // Prisma Gender enum (MALE/FEMALE). We trust the applicant's
          // submission matches the enum — a valid enum value is enforced
          // on the frontend form, and any mismatch will surface as a
          // Prisma validation error before anything is written.
          gender: applicant.gender as 'MALE' | 'FEMALE',
          admissionNumber,
          address: applicant.address,
          // Derive email from admission number for portal login
          email: `${admissionNumber.toLowerCase()}@students.school.ng`,
          passwordHash,
        },
      });

      // Link guardian to student
      await tx.studentGuardian.create({
        data: {
          studentId: student.id,
          guardianId: guardian.id,
          relationship: 'Parent/Guardian',
        },
      });

      // Create initial enrollment
      await tx.enrollment.create({
        data: {
          studentId: student.id,
          classId: dto.classId,
          armId: dto.armId,
          termId: currentTerm.id,
          status: 'ACTIVE',
        },
      });

      // Mark applicant as converted
      await tx.applicant.update({
        where: { id },
        data: { status: 'CONVERTED', convertedStudentId: student.id },
      });

      return { student, guardian };
    });

    await this.auditLog.write({
      actorId: actor.id,
      actorType: 'STAFF',
      actorRole: actor.roles.join(','),
      action: 'ADMISSION_CONVERTED',
      entityType: 'Applicant',
      entityId: id,
      afterJson: {
        studentId: result.student.id,
        classId: dto.classId,
        armId: dto.armId,
      },
    });

    // Send welcome SMS/email (non-blocking — best-effort)
    this.broadcastsService
      .sendAdmissionWelcome({
        guardianEmail: result.guardian.email,
        guardianPhone: result.guardian.phone ?? undefined,
        guardianName: `${result.guardian.firstName} ${result.guardian.lastName}`,
        studentName: `${result.student.firstName} ${result.student.lastName}`,
        admissionNumber: result.student.admissionNumber,
        temporaryPassword,
      })
      .catch(() => undefined);

    return { studentId: result.student.id, temporaryPassword };
  }

  static isAdmissionFeeReference(reference: string): boolean {
    return reference.startsWith(ADMISSION_REFERENCE_PREFIX);
  }

  // Mirrors StudentsService.generateAdmissionNumber (private there, reproduced
  // here rather than coupling AdmissionsService → StudentsService which would
  // create a circular dependency risk).
  private async generateAdmissionNumber(
    client: Prisma.TransactionClient,
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
}
