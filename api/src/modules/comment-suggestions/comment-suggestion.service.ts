import {
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import type { EnvConfig } from '../../common/config/env.validation';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { ResultsService } from '../results/results.service';
import { CommentType } from './dto/suggest-comment.dto';

interface StudentDataSummary {
  firstName: string;
  className: string;
  armName: string;
  termName: string;
  overallAverage: number;
  overallPosition: number;
  classSize: number;
  attendanceRate: number | null;
  subjects: {
    name: string;
    componentScores: { name: string; score: number | null; maxScore: number }[];
    total: number;
    grade: string;
  }[];
  affectiveRatings: { category: string; score: number }[];
  psychomotorRatings: { category: string; score: number }[];
}

const COMMENT_TONE: Record<CommentType, string> = {
  [CommentType.FORM_TEACHER]:
    "a form teacher's comment — warm, personal, and pastoral, as if written by someone who sees this student daily",
  [CommentType.PRINCIPAL]:
    "a principal's comment — brief, formal, and summary-level, as if written by someone who only sees the collated result",
};

/**
 * Stage 30 (docs/19-unique-differentiators.md §4, docs/14 §10). Returns a
 * suggestion only — never writes to StudentTermResult itself. The only
 * path a comment reaches the database is the existing
 * submitConduct/setPrincipalComment endpoints, which a human explicitly
 * calls after reviewing (and possibly editing) what comes back here.
 */
@Injectable()
export class CommentSuggestionService {
  private readonly logger = new Logger(CommentSuggestionService.name);
  private readonly anthropic: Anthropic;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly resultsService: ResultsService,
    private readonly auditLog: AuditLogService,
    configService: ConfigService<EnvConfig, true>,
  ) {
    this.anthropic = new Anthropic({
      apiKey: configService.get('ANTHROPIC_API_KEY', { infer: true }),
    });
    this.model = configService.get('ANTHROPIC_MODEL', { infer: true });
  }

  async suggest(
    armId: string,
    termId: string,
    studentId: string,
    commentType: CommentType,
    user: RequestUser,
  ): Promise<{ suggestion: string }> {
    await this.assertCanRequestSuggestion(armId, commentType, user);

    // Also confirms the student is actively enrolled in this arm/term —
    // buildReportCardData throws NotFoundException otherwise (it computes
    // from the same active-enrollment rows the broadsheet does).
    const reportCardData = await this.resultsService.buildReportCardData(
      studentId,
      armId,
      termId,
    );

    const summary: StudentDataSummary = {
      firstName: reportCardData.student.firstName,
      className: reportCardData.className,
      armName: reportCardData.armName,
      termName: reportCardData.termName,
      // Rounded to 1dp — same as report-card.template.ts's fmt() — so the
      // prompt (and any number the model echoes back) reads like
      // "69.3%", not the raw repeating-decimal division result.
      overallAverage: Math.round(reportCardData.overallAverage * 10) / 10,
      overallPosition: reportCardData.overallPosition,
      classSize: reportCardData.classSize,
      attendanceRate:
        reportCardData.attendance.totalDays > 0
          ? Math.round(
              (reportCardData.attendance.presentDays /
                reportCardData.attendance.totalDays) *
                1000,
            ) / 10
          : null,
      subjects: reportCardData.subjects.map((s) => ({
        name: s.subjectName,
        componentScores: s.componentScores,
        total: Math.round(s.total * 10) / 10,
        grade: s.grade,
      })),
      affectiveRatings: reportCardData.affectiveRatings,
      psychomotorRatings: reportCardData.psychomotorRatings,
    };

    const prompt = this.buildPrompt(summary, commentType);

    let suggestion: string;
    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });
      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );
      if (!textBlock) {
        throw new Error('Anthropic response contained no text block');
      }
      suggestion = textBlock.text.trim();
    } catch (error) {
      this.logger.warn(
        `Comment suggestion failed for student ${studentId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw new ServiceUnavailableException(
        "Couldn't generate a suggestion right now — try again, or write the comment directly.",
      );
    }

    // Log a summary of what was sent (not the full data dump, and never
    // the guardian-contact/bio-data fields buildReportCardData also
    // carries) alongside what came back, for traceability without
    // duplicating the whole prompt in the audit trail.
    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'COMMENT_SUGGESTION_REQUESTED',
      entityType: 'StudentTermResult',
      entityId: studentId,
      afterJson: {
        commentType,
        inputSummary: {
          firstName: summary.firstName,
          overallAverage: summary.overallAverage,
          overallPosition: summary.overallPosition,
          attendanceRate: summary.attendanceRate,
        },
        suggestion,
      },
    });

    return { suggestion };
  }

  private async assertCanRequestSuggestion(
    armId: string,
    commentType: CommentType,
    user: RequestUser,
  ): Promise<void> {
    if (user.roles.includes('ADMIN')) return;

    if (commentType === CommentType.PRINCIPAL) {
      // setPrincipalComment itself is ADMIN-only — a suggestion for a
      // field this caller could never save into would just be a dead end.
      throw new ForbiddenException(
        'Only an Admin can request a principal-comment suggestion',
      );
    }

    if (!user.roles.includes('CLASS_TEACHER')) {
      throw new ForbiddenException(
        'Only this arm’s Class Teacher (or an Admin) can request a comment suggestion',
      );
    }

    const arm = await this.prisma.arm.findUnique({ where: { id: armId } });
    if (!arm || arm.classTeacherId !== user.id) {
      throw new ForbiddenException(
        'Only this arm’s Class Teacher (or an Admin) can request a comment suggestion',
      );
    }
  }

  private buildPrompt(
    summary: StudentDataSummary,
    commentType: CommentType,
  ): string {
    return `You are helping a Nigerian secondary school write ${COMMENT_TONE[commentType]} for a student's term report card.

Ground the comment in the specific data below — do not write generic filler that could apply to any student. Mention concrete, specific trends (e.g. an improving or declining subject across its assessment components, a strong or weak attendance record, a standout or concerning conduct rating) rather than vague praise. Keep it to 2-3 sentences, encouraging but honest, appropriate to share with a parent.

Student: ${summary.firstName}
Class: ${summary.className} ${summary.armName}, ${summary.termName} Term
Overall average: ${summary.overallAverage}% (position ${summary.overallPosition} of ${summary.classSize})
Attendance rate: ${summary.attendanceRate ?? 'no attendance data on file'}%

Subjects:
${summary.subjects
  .map(
    (s) =>
      `- ${s.name}: ${s.total}% (${s.grade}) — ${s.componentScores
        .map((c) => `${c.name} ${c.score ?? '—'}/${c.maxScore}`)
        .join(', ')}`,
  )
  .join('\n')}

Affective ratings (1-5): ${summary.affectiveRatings.map((r) => `${r.category}=${r.score}`).join(', ') || 'none recorded'}
Psychomotor ratings (1-5): ${summary.psychomotorRatings.map((r) => `${r.category}=${r.score}`).join(', ') || 'none recorded'}

Write only the comment itself, no preamble or labels.`;
  }
}
