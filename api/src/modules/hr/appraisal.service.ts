import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AppraisalCycle,
  AppraisalForm,
  AppraisalSubmission,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import {
  CreateAppraisalCycleDto,
  CreateAppraisalSubmissionDto,
  SaveAppraisalResponsesDto,
  UpdateAppraisalCycleStatusDto,
  UpsertAppraisalFormDto,
} from './dto/appraisal.dto';

const HR_ROLES = ['HR_OFFICER', 'ADMIN'];

export interface AppraisalFormDefinition {
  ratedCategories: { key: string; label: string; maxScore: number }[];
  freeTextSections: { key: string; label: string }[];
}

@Injectable()
export class AppraisalService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------
  // Form definition — a genuinely school-configurable rubric. Each save
  // creates a new version rather than mutating in place, so a cycle
  // already in progress keeps the exact rubric its reviewers started
  // against even if HR tweaks the categories afterward.
  // -------------------------------------------------------------------

  async upsertForm(
    dto: UpsertAppraisalFormDto,
    user: RequestUser,
  ): Promise<AppraisalForm> {
    const sections: AppraisalFormDefinition = {
      ratedCategories: dto.ratedCategories,
      freeTextSections: dto.freeTextSections,
    };
    return this.prisma.appraisalForm.create({
      data: {
        name: dto.name,
        sections: sections as unknown as Prisma.InputJsonValue,
        createdByStaffId: user.id,
      },
    });
  }

  listForms(): Promise<AppraisalForm[]> {
    return this.prisma.appraisalForm.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getCurrentForm(): Promise<AppraisalForm> {
    const form = await this.prisma.appraisalForm.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!form) {
      throw new BadRequestException(
        'No appraisal form has been configured yet — create one before starting a cycle.',
      );
    }
    return form;
  }

  // -------------------------------------------------------------------
  // Cycles
  // -------------------------------------------------------------------

  async createCycle(
    dto: CreateAppraisalCycleDto,
    user: RequestUser,
  ): Promise<AppraisalCycle> {
    const form = dto.formId
      ? await this.prisma.appraisalForm.findUnique({
          where: { id: dto.formId },
        })
      : await this.getCurrentForm();
    if (!form) throw new NotFoundException('Appraisal form not found');

    return this.prisma.appraisalCycle.create({
      data: {
        name: dto.name,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        formId: form.id,
        createdByStaffId: user.id,
      },
    });
  }

  listCycles() {
    return this.prisma.appraisalCycle.findMany({
      include: { _count: { select: { submissions: true } } },
      orderBy: { periodStart: 'desc' },
    });
  }

  async getCycle(id: string) {
    const cycle = await this.prisma.appraisalCycle.findUnique({
      where: { id },
      include: {
        form: true,
        submissions: {
          include: {
            staff: { select: { id: true, firstName: true, lastName: true } },
            reviewer: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!cycle) throw new NotFoundException('Appraisal cycle not found');
    return cycle;
  }

  async updateCycleStatus(
    id: string,
    dto: UpdateAppraisalCycleStatusDto,
  ): Promise<AppraisalCycle> {
    const cycle = await this.prisma.appraisalCycle.findUnique({
      where: { id },
    });
    if (!cycle) throw new NotFoundException('Appraisal cycle not found');
    return this.prisma.appraisalCycle.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  // -------------------------------------------------------------------
  // Submissions
  // -------------------------------------------------------------------

  async createSubmission(
    cycleId: string,
    dto: CreateAppraisalSubmissionDto,
  ): Promise<AppraisalSubmission> {
    const cycle = await this.prisma.appraisalCycle.findUnique({
      where: { id: cycleId },
    });
    if (!cycle) throw new NotFoundException('Appraisal cycle not found');

    const [staff, reviewer] = await Promise.all([
      this.prisma.staff.findUnique({ where: { id: dto.staffId } }),
      this.prisma.staff.findUnique({ where: { id: dto.reviewerId } }),
    ]);
    if (!staff) throw new BadRequestException('Staff member not found');
    if (!reviewer) throw new BadRequestException('Reviewer not found');

    try {
      return await this.prisma.appraisalSubmission.create({
        data: { cycleId, staffId: dto.staffId, reviewerId: dto.reviewerId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This staff member already has a submission in this cycle.',
        );
      }
      throw error;
    }
  }

  listMySubmissions(reviewerId: string) {
    return this.prisma.appraisalSubmission.findMany({
      where: { reviewerId },
      include: {
        cycle: { include: { form: true } },
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getSubmissionOrThrow(id: string) {
    const submission = await this.prisma.appraisalSubmission.findUnique({
      where: { id },
      include: {
        cycle: { include: { form: true } },
        staff: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!submission)
      throw new NotFoundException('Appraisal submission not found');
    return submission;
  }

  async getSubmission(id: string, user: RequestUser) {
    const submission = await this.getSubmissionOrThrow(id);
    const isHr = user.roles.some((r) => HR_ROLES.includes(r));
    if (
      !isHr &&
      submission.reviewerId !== user.id &&
      submission.staffId !== user.id
    ) {
      throw new ForbiddenException('You cannot view this appraisal submission');
    }
    return submission;
  }

  /** Only the assigned reviewer (or HR/Admin) may fill in and submit — the reviewer assignment set at creation is the sole access gate. */
  async saveResponses(
    id: string,
    dto: SaveAppraisalResponsesDto,
    user: RequestUser,
  ): Promise<AppraisalSubmission> {
    const submission = await this.getSubmissionOrThrow(id);
    const isHr = user.roles.some((r) => HR_ROLES.includes(r));
    if (!isHr && submission.reviewerId !== user.id) {
      throw new ForbiddenException(
        'Only the assigned reviewer can fill in this appraisal',
      );
    }
    if (submission.status !== 'DRAFT') {
      throw new ConflictException('This appraisal has already been submitted');
    }

    return this.prisma.appraisalSubmission.update({
      where: { id },
      data: {
        responses: {
          ratings: dto.ratings,
          freeText: dto.freeText,
        },
        ...(dto.submit && { status: 'SUBMITTED', submittedAt: new Date() }),
      },
    });
  }

  async signOff(id: string, user: RequestUser): Promise<AppraisalSubmission> {
    const submission = await this.getSubmissionOrThrow(id);
    if (submission.status !== 'SUBMITTED') {
      throw new ConflictException(
        'Only a SUBMITTED appraisal can be signed off',
      );
    }
    return this.prisma.appraisalSubmission.update({
      where: { id },
      data: {
        status: 'SIGNED_OFF',
        signedOffByStaffId: user.id,
        signedOffAt: new Date(),
      },
    });
  }

  getStaffHistory(staffId: string) {
    return this.prisma.appraisalSubmission.findMany({
      where: { staffId },
      include: {
        cycle: { include: { form: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
