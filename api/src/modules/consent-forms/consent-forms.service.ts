import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ConsentForm, ConsentResponseValue } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { ClassScopeService } from '../communication/class-scope.service';
import {
  CreateConsentFormDto,
  RespondConsentFormDto,
} from './dto/consent-form.dto';

const FORM_INCLUDE = {
  createdBy: { select: { firstName: true, lastName: true } },
} as const;

export interface ConsentRespondentRow {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  guardianName: string | null;
  response: ConsentResponseValue | null;
  signatureName: string | null;
  respondedAt: Date | null;
}

export interface ConsentResponsesResult {
  tally: { consented: number; declined: number; noResponse: number };
  respondents: ConsentRespondentRow[];
}

@Injectable()
export class ConsentFormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classScope: ClassScopeService,
  ) {}

  private isUnscoped(user: RequestUser): boolean {
    return (
      user.roles.includes('ADMIN') || user.roles.includes('VICE_PRINCIPAL')
    );
  }

  async create(
    dto: CreateConsentFormDto,
    user: RequestUser,
  ): Promise<ConsentForm> {
    if (dto.targetArmId) {
      const arm = await this.prisma.arm.findUnique({
        where: { id: dto.targetArmId },
      });
      if (!arm) throw new NotFoundException('Arm not found');
      // A Class Teacher may only target their own arm — same
      // ClassScopeService rule as broadcasts/conversations.
      if (!this.classScope.isUnscoped(user)) {
        await this.classScope.assertOwnClassScope([arm], user);
      }
    } else if (!this.isUnscoped(user)) {
      throw new ForbiddenException(
        'Only an Admin or Vice Principal can send a whole-school consent form',
      );
    }

    return this.prisma.consentForm.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        targetType: dto.targetArmId ? 'CLASS' : 'WHOLE_SCHOOL',
        targetArmId: dto.targetArmId ?? null,
        createdByStaffId: user.id,
      },
      include: FORM_INCLUDE,
    });
  }

  /**
   * Staff: own forms (unscoped roles: all), with a response tally per row.
   * Guardians: forms targeting any of their wards, with that ward's
   * existing response attached per (form, ward) pair.
   */
  async list(user: RequestUser) {
    if (user.userType === 'GUARDIAN') {
      return this.listForGuardian(user);
    }

    const forms = await this.prisma.consentForm.findMany({
      where: this.isUnscoped(user) ? {} : { createdByStaffId: user.id },
      orderBy: { createdAt: 'desc' },
      include: FORM_INCLUDE,
    });

    // Attach arm labels + tallies.
    const results: ((typeof forms)[number] & {
      armLabel: string | null;
      tally: { consented: number; declined: number; noResponse: number };
    })[] = [];
    for (const form of forms) {
      const targeted = await this.targetedStudents(form);
      const responses = await this.prisma.consentResponse.findMany({
        where: { consentFormId: form.id },
      });
      const consented = responses.filter(
        (r) => r.response === 'CONSENTED',
      ).length;
      const declined = responses.filter(
        (r) => r.response === 'DECLINED',
      ).length;
      results.push({
        ...form,
        armLabel: await this.armLabel(form.targetArmId),
        tally: {
          consented,
          declined,
          noResponse: Math.max(0, targeted.length - consented - declined),
        },
      });
    }
    return results;
  }

  private async listForGuardian(user: RequestUser) {
    const links = await this.prisma.studentGuardian.findMany({
      where: { guardianId: user.id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    if (links.length === 0) return [];

    const wardIds = links.map((l) => l.studentId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: { in: wardIds }, status: 'ACTIVE' },
    });

    type GuardianFormRow = ConsentForm & {
      createdBy: { firstName: string; lastName: string };
      student: { id: string; firstName: string; lastName: string };
      myResponse: {
        id: string;
        response: ConsentResponseValue;
        signatureName: string;
        respondedAt: Date;
      } | null;
    };
    const results: GuardianFormRow[] = [];
    for (const link of links) {
      const enrollment = enrollments.find(
        (e) => e.studentId === link.studentId,
      );
      if (!enrollment) continue;
      const forms = await this.prisma.consentForm.findMany({
        where: {
          OR: [
            { targetType: 'WHOLE_SCHOOL' },
            { targetType: 'CLASS', targetArmId: enrollment.armId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: FORM_INCLUDE,
      });
      const responses = await this.prisma.consentResponse.findMany({
        where: {
          consentFormId: { in: forms.map((f) => f.id) },
          studentId: link.studentId,
        },
      });
      const responseByForm = new Map(
        responses.map((r) => [r.consentFormId, r]),
      );
      results.push(
        ...forms.map((form) => ({
          ...form,
          student: link.student,
          myResponse: responseByForm.get(form.id) ?? null,
        })),
      );
    }
    return results;
  }

  async respond(formId: string, dto: RespondConsentFormDto, user: RequestUser) {
    const form = await this.prisma.consentForm.findUnique({
      where: { id: formId },
    });
    if (!form) throw new NotFoundException('Consent form not found');

    // The responding guardian must be linked to the student…
    const link = await this.prisma.studentGuardian.findUnique({
      where: {
        studentId_guardianId: {
          studentId: dto.studentId,
          guardianId: user.id,
        },
      },
    });
    if (!link) {
      throw new ForbiddenException('You can only respond for your own ward');
    }

    // …and the form must actually target that student.
    if (form.targetType === 'CLASS') {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId: dto.studentId,
          armId: form.targetArmId!,
          status: 'ACTIVE',
        },
      });
      if (!enrollment) {
        throw new BadRequestException(
          "This consent form does not apply to this student's class",
        );
      }
    }

    // One response per student per form — a re-submit (or the other
    // guardian responding) overwrites, same idempotent stance as RSVP.
    return this.prisma.consentResponse.upsert({
      where: {
        consentFormId_studentId: {
          consentFormId: formId,
          studentId: dto.studentId,
        },
      },
      update: {
        guardianId: user.id,
        response: dto.response,
        signatureName: dto.signatureName.trim(),
        respondedAt: new Date(),
      },
      create: {
        consentFormId: formId,
        studentId: dto.studentId,
        guardianId: user.id,
        response: dto.response,
        signatureName: dto.signatureName.trim(),
      },
    });
  }

  /** Tally + full respondent list including who HASN'T responded — the RSVP-respondents shape. */
  async getResponses(
    formId: string,
    user: RequestUser,
  ): Promise<ConsentResponsesResult> {
    const form = await this.prisma.consentForm.findUnique({
      where: { id: formId },
    });
    if (!form) throw new NotFoundException('Consent form not found');
    if (!this.isUnscoped(user) && form.createdByStaffId !== user.id) {
      throw new ForbiddenException(
        'Only the sender can view individual responses',
      );
    }

    const targeted = await this.targetedStudents(form);
    const responses = await this.prisma.consentResponse.findMany({
      where: { consentFormId: formId },
      include: {
        guardian: { select: { firstName: true, lastName: true } },
      },
    });
    const responseByStudent = new Map(responses.map((r) => [r.studentId, r]));

    const respondents: ConsentRespondentRow[] = targeted.map((student) => {
      const response = responseByStudent.get(student.id);
      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        guardianName: response
          ? `${response.guardian.firstName} ${response.guardian.lastName}`
          : null,
        response: response?.response ?? null,
        signatureName: response?.signatureName ?? null,
        respondedAt: response?.respondedAt ?? null,
      };
    });

    const consented = respondents.filter(
      (r) => r.response === 'CONSENTED',
    ).length;
    const declined = respondents.filter(
      (r) => r.response === 'DECLINED',
    ).length;

    return {
      tally: {
        consented,
        declined,
        noResponse: respondents.length - consented - declined,
      },
      respondents,
    };
  }

  /** Every actively-enrolled student the form targets. */
  private async targetedStudents(form: ConsentForm) {
    const where =
      form.targetType === 'CLASS'
        ? { armId: form.targetArmId!, status: 'ACTIVE' as const }
        : { status: 'ACTIVE' as const };
    const enrollments = await this.prisma.enrollment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    });
    return enrollments.map((e) => e.student);
  }

  private async armLabel(armId: string | null): Promise<string | null> {
    if (!armId) return null;
    const arm = await this.prisma.arm.findUnique({
      where: { id: armId },
      include: { class: true },
    });
    return arm ? `${arm.class.name} ${arm.name}` : null;
  }
}
