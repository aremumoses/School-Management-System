import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AssessmentComponent } from '@prisma/client';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { translatePrismaError } from '../../common/utils/prisma-error';
import {
  CreateAssessmentComponentDto,
  UpdateAssessmentComponentDto,
} from './dto/assessment-component.dto';

export const WEIGHT_SUM_TARGET = 100;
export const WEIGHT_SUM_TOLERANCE = 0.01;

@Injectable()
export class AssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async listForTerm(termId: string): Promise<AssessmentComponent[]> {
    return this.prisma.assessmentComponent.findMany({
      where: { termId },
      orderBy: [{ subjectId: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * The component set that actually governs scoring for this subject this
   * term. A subject with any override rows of its own uses ONLY those — a
   * subject either runs the school's default CA structure in full or
   * defines a complete structure of its own; there's no per-component
   * merge, which would leave ambiguous gaps if an override doesn't name
   * every default component.
   */
  async getEffectiveComponents(
    termId: string,
    subjectId: string,
  ): Promise<AssessmentComponent[]> {
    const overrides = await this.prisma.assessmentComponent.findMany({
      where: { termId, subjectId },
      orderBy: { name: 'asc' },
    });
    if (overrides.length > 0) return overrides;
    return this.prisma.assessmentComponent.findMany({
      where: { termId, subjectId: null },
      orderBy: { name: 'asc' },
    });
  }

  async create(
    dto: CreateAssessmentComponentDto,
    user: RequestUser,
  ): Promise<AssessmentComponent> {
    await this.assertTermExists(dto.termId);
    if (dto.subjectId) await this.assertSubjectExists(dto.subjectId);
    await this.assertWeightWithinBudget(
      dto.termId,
      dto.subjectId ?? null,
      dto.weight,
    );
    await this.assertStructureNotLocked(
      dto.termId,
      dto.subjectId ?? null,
      'add a new component to this structure',
    );

    if (!dto.subjectId) {
      // @@unique([termId, subjectId, name]) never fires at the DB level
      // for subjectId IS NULL rows (Postgres treats every NULL as
      // distinct from every other NULL in a unique index), so the
      // school-wide default rows need an explicit pre-check here —
      // translatePrismaError's P2002 handling below only catches the
      // subjectId-set case.
      const existing = await this.prisma.assessmentComponent.findFirst({
        where: { termId: dto.termId, subjectId: null, name: dto.name },
      });
      if (existing) {
        throw new ConflictException(
          'A component with this name already exists for this term/subject',
        );
      }
    }

    let created: AssessmentComponent;
    try {
      created = await this.prisma.assessmentComponent.create({
        data: {
          termId: dto.termId,
          subjectId: dto.subjectId,
          name: dto.name,
          maxScore: dto.maxScore,
          weight: dto.weight,
        },
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'A component with this name already exists for this term/subject',
      );
    }

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'ASSESSMENT_COMPONENT_CREATE',
      entityType: 'AssessmentComponent',
      entityId: created.id,
      afterJson: { ...created },
    });
    return created;
  }

  async update(
    id: string,
    dto: UpdateAssessmentComponentDto,
    user: RequestUser,
  ): Promise<AssessmentComponent> {
    const existing = await this.getOrThrow(id);
    if (dto.weight !== undefined) {
      await this.assertWeightWithinBudget(
        existing.termId,
        existing.subjectId,
        dto.weight,
        id,
      );
    }
    if (dto.weight !== undefined || dto.maxScore !== undefined) {
      // Changing the weight retroactively shifts every already-computed
      // percentage for whoever already locked scores against it; lowering
      // maxScore can make an already-recorded score literally exceed the
      // new ceiling (the second check below). Both are real data-integrity
      // problems, not just a fairness concern, so both are blocked outright
      // rather than just warned about.
      await this.assertStructureNotLocked(
        existing.termId,
        existing.subjectId,
        "change this component's weight or max score",
      );
    }
    if (dto.maxScore !== undefined && dto.maxScore < existing.maxScore) {
      const highest = await this.prisma.score.aggregate({
        where: { assessmentComponentId: id },
        _max: { score: true },
      });
      if (highest._max.score !== null && highest._max.score > dto.maxScore) {
        throw new BadRequestException(
          `Cannot lower the max score below ${highest._max.score} — a score already recorded against this component exceeds that. Correct or clear those scores first.`,
        );
      }
    }
    if (dto.name && !existing.subjectId) {
      const nameCollision = await this.prisma.assessmentComponent.findFirst({
        where: {
          termId: existing.termId,
          subjectId: null,
          name: dto.name,
          id: { not: id },
        },
      });
      if (nameCollision) {
        throw new ConflictException(
          'A component with this name already exists for this term/subject',
        );
      }
    }
    let updated: AssessmentComponent;
    try {
      updated = await this.prisma.assessmentComponent.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'A component with this name already exists for this term/subject',
      );
    }

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'ASSESSMENT_COMPONENT_UPDATE',
      entityType: 'AssessmentComponent',
      entityId: id,
      beforeJson: { ...existing },
      afterJson: { ...updated },
    });
    return updated;
  }

  async delete(id: string, user: RequestUser): Promise<void> {
    const existing = await this.getOrThrow(id);
    // The FK Restrict on Score.assessmentComponentId already blocks deleting
    // a component that has any Score rows — but a teacher can lock a
    // submission without entering every component (submit() only touches
    // whatever's in the request body), so a never-scored component could
    // still be silently removed from an already-locked structure without
    // this extra check.
    await this.assertStructureNotLocked(
      existing.termId,
      existing.subjectId,
      'remove this component from this structure',
    );
    try {
      await this.prisma.assessmentComponent.delete({ where: { id } });
    } catch (error) {
      translatePrismaError(
        error,
        'Cannot delete — scores have already been recorded against this component',
      );
    }

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'ASSESSMENT_COMPONENT_DELETE',
      entityType: 'AssessmentComponent',
      entityId: id,
      beforeJson: { ...existing },
    });
  }

  /**
   * Called by ScoresService before accepting a submission. A subject whose
   * effective components don't sum to 100 yet (still being configured, or
   * just never finished) can't have scores locked against it, since every
   * downstream computation (grade lookup, ranking, report card) assumes the
   * total is a genuine percentage.
   */
  async assertReadyForSubmission(
    termId: string,
    subjectId: string,
  ): Promise<AssessmentComponent[]> {
    const components = await this.getEffectiveComponents(termId, subjectId);
    if (components.length === 0) {
      throw new BadRequestException(
        'No assessment components are configured for this subject/term yet — ask an Admin to set them up first.',
      );
    }
    const sum = components.reduce((total, c) => total + c.weight, 0);
    if (Math.abs(sum - WEIGHT_SUM_TARGET) > WEIGHT_SUM_TOLERANCE) {
      throw new BadRequestException(
        `This subject's assessment components sum to ${sum}, not ${WEIGHT_SUM_TARGET} — ask an Admin to fix the weights before scores can be submitted.`,
      );
    }
    return components;
  }

  /**
   * Which ClassSubjects a (termId, subjectId) component scope actually
   * governs — a subject-specific override only affects that subject's
   * classes; the school-wide default affects every subject that does NOT
   * have an override of its own (see getEffectiveComponents).
   */
  private async getAffectedClassSubjectIds(
    termId: string,
    subjectId: string | null,
  ): Promise<string[]> {
    if (subjectId) {
      const classSubjects = await this.prisma.classSubject.findMany({
        where: { subjectId },
        select: { id: true },
      });
      return classSubjects.map((c) => c.id);
    }
    const overriddenSubjects = await this.prisma.assessmentComponent.findMany({
      where: { termId, subjectId: { not: null } },
      select: { subjectId: true },
      distinct: ['subjectId'],
    });
    const overriddenSubjectIds = overriddenSubjects
      .map((s) => s.subjectId)
      .filter((value): value is string => value !== null);
    const classSubjects = await this.prisma.classSubject.findMany({
      where:
        overriddenSubjectIds.length > 0
          ? { subjectId: { notIn: overriddenSubjectIds } }
          : {},
      select: { id: true },
    });
    return classSubjects.map((c) => c.id);
  }

  /**
   * Blocks structural changes (add/reweight/resize/remove a component)
   * once any teacher has already locked scores against the set it belongs
   * to — changing the rules after scores are in would silently invalidate
   * already-submitted percentages.
   */
  private async assertStructureNotLocked(
    termId: string,
    subjectId: string | null,
    actionDescription: string,
  ): Promise<void> {
    const classSubjectIds = await this.getAffectedClassSubjectIds(
      termId,
      subjectId,
    );
    if (classSubjectIds.length === 0) return;
    const lockedSubmission = await this.prisma.scoreSubmission.findFirst({
      where: { termId, classSubjectId: { in: classSubjectIds }, locked: true },
    });
    if (lockedSubmission) {
      // The school-wide default is shared by every subject without an
      // override of its own, so it can end up "locked" by a class totally
      // unrelated to whatever the caller is actually trying to change —
      // the suggested workaround is to give the subject they care about
      // its own override instead of editing the shared default.
      const suggestion = subjectId
        ? 'Ask an Exam Officer to unlock the affected submission(s) first.'
        : 'Ask an Exam Officer to unlock the affected submission(s) first, or create a subject-specific override instead of editing the shared default.';
      throw new BadRequestException(
        `Cannot ${actionDescription} — scores have already been submitted and locked using it. ${suggestion}`,
      );
    }
  }

  private async assertWeightWithinBudget(
    termId: string,
    subjectId: string | null,
    weight: number,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.assessmentComponent.findMany({
      where: {
        termId,
        subjectId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    const sum = existing.reduce((total, c) => total + c.weight, 0) + weight;
    if (sum > WEIGHT_SUM_TARGET + WEIGHT_SUM_TOLERANCE) {
      throw new BadRequestException(
        `Adding this component would bring the total to ${sum}, exceeding ${WEIGHT_SUM_TARGET} — reduce another component's weight first.`,
      );
    }
  }

  private async assertTermExists(termId: string): Promise<void> {
    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) throw new NotFoundException('Term not found');
  }

  private async assertSubjectExists(subjectId: string): Promise<void> {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
  }

  private async getOrThrow(id: string): Promise<AssessmentComponent> {
    const component = await this.prisma.assessmentComponent.findUnique({
      where: { id },
    });
    if (!component)
      throw new NotFoundException('Assessment component not found');
    return component;
  }
}
