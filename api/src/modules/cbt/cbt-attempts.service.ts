import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Prisma, Question } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { GradeEssayDto, SaveAnswerDto } from './dto/cbt.dto';
import { shuffle } from './cbt-tests.service';

// A few seconds of grace over the strict limit so an answer fired at the
// buzzer isn't rejected by clock skew.
const GRACE_MS = 5_000;

interface McqOption {
  id: string;
  text: string;
}

/** What a student sees while taking the test — never the correct answer. */
export interface TakingQuestion {
  questionId: string;
  type: Question['type'];
  prompt: string;
  imageUrl: string | null;
  points: number;
  options: unknown;
}

@Injectable()
export class CBTAttemptsService {
  private readonly logger = new Logger(CBTAttemptsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------
  // Start
  // -------------------------------------------------------------------

  async start(testId: string, user: RequestUser) {
    const test = await this.prisma.cBTTest.findUnique({
      where: { id: testId },
      include: {
        classSubject: true,
        questions: { include: { question: true }, orderBy: { order: 'asc' } },
      },
    });
    if (!test) throw new NotFoundException('Test not found');
    if (test.questions.length === 0) {
      throw new BadRequestException('This test has no questions yet');
    }

    // Enrollment check — the test must be for the student's class.
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId: user.id,
        classId: test.classSubject.classId,
        status: 'ACTIVE',
      },
    });
    if (!enrollment) {
      throw new ForbiddenException('This test is not for your class');
    }

    const now = Date.now();
    if (now < test.availableFrom.getTime()) {
      throw new BadRequestException('This test has not opened yet');
    }
    if (now > test.availableTo.getTime()) {
      throw new BadRequestException('This test has closed');
    }

    // Resume an open attempt rather than burning another one.
    const existing = await this.prisma.cBTAttempt.findFirst({
      where: { testId, studentId: user.id, status: 'IN_PROGRESS' },
    });
    if (existing) return this.getForOwner(existing.id, user);

    const used = await this.prisma.cBTAttempt.count({
      where: { testId, studentId: user.id },
    });
    if (used >= test.attemptsAllowed) {
      throw new BadRequestException(
        `You have used all ${test.attemptsAllowed} attempt${test.attemptsAllowed === 1 ? '' : 's'} for this test`,
      );
    }

    // The per-student randomization snapshot — generated once, persisted.
    const questionOrder = shuffle(test.questions.map((q) => q.questionId));
    const optionOrders: Record<string, string[]> = {};
    for (const tq of test.questions) {
      const q = tq.question;
      if (q.type === 'MCQ_SINGLE' || q.type === 'MCQ_MULTIPLE') {
        const options = (q.options as unknown as McqOption[]) ?? [];
        optionOrders[q.id] = shuffle(options.map((o) => o.id));
      } else if (q.type === 'MATCHING') {
        const options = q.options as unknown as {
          left: McqOption[];
          right: McqOption[];
        } | null;
        if (options?.right) {
          optionOrders[q.id] = shuffle(options.right.map((o) => o.id));
        }
      }
    }

    const maxScore = test.questions.reduce((sum, q) => sum + q.points, 0);
    const attempt = await this.prisma.cBTAttempt.create({
      data: {
        testId,
        studentId: user.id,
        questionOrder: questionOrder,
        optionOrders: optionOrders,
        maxScore,
      },
    });
    return this.getForOwner(attempt.id, user);
  }

  // -------------------------------------------------------------------
  // Read (owner) — taking view or result view depending on status
  // -------------------------------------------------------------------

  async getForOwner(attemptId: string, user: RequestUser) {
    const attempt = await this.prisma.cBTAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            classSubject: { include: { subject: true, class: true } },
            questions: { include: { question: true } },
          },
        },
        answers: true,
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (user.userType === 'STUDENT' && attempt.studentId !== user.id) {
      throw new ForbiddenException('This is not your attempt');
    }

    const { test } = attempt;
    const byQuestionId = new Map(
      test.questions.map((tq) => [tq.questionId, tq]),
    );
    const questionOrder = attempt.questionOrder as unknown as string[];
    const optionOrders = attempt.optionOrders as unknown as Record<
      string,
      string[]
    >;

    const orderedQuestions: TakingQuestion[] = questionOrder.map((qid) => {
      const tq = byQuestionId.get(qid)!;
      return {
        questionId: qid,
        type: tq.question.type,
        prompt: tq.question.prompt,
        imageUrl: tq.question.imageUrl,
        points: tq.points,
        options: this.reorderOptions(tq.question, optionOrders[qid]),
      };
    });

    const deadline =
      attempt.startedAt.getTime() + test.timeLimitMinutes * 60_000;
    const remainingSeconds = Math.max(
      0,
      Math.floor((deadline - Date.now()) / 1000),
    );

    const hasEssay = test.questions.some((tq) => tq.question.type === 'ESSAY');
    const released =
      attempt.gradedAt !== null && (test.instantRelease || hasEssay);

    return {
      id: attempt.id,
      testId: test.id,
      testTitle: test.title,
      subjectName: test.classSubject.subject.name,
      isMockPractice: test.isMockPractice,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      timeLimitMinutes: test.timeLimitMinutes,
      remainingSeconds: attempt.status === 'IN_PROGRESS' ? remainingSeconds : 0,
      questions: orderedQuestions,
      // Saved answers so a refresh resumes exactly where the student was.
      answers: attempt.answers.map((a) => ({
        questionId: a.questionId,
        answer: a.answer,
        // Per-question marks only after release.
        score: released ? a.score : null,
        feedback: released ? a.feedback : null,
      })),
      maxScore: attempt.maxScore,
      score: released ? attempt.score : null,
      released,
      passMark: test.passMark,
      // Correct answers only after release AND when the test allows it.
      correctAnswers:
        released && test.showCorrectAnswersAfter
          ? Object.fromEntries(
              test.questions.map((tq) => [
                tq.questionId,
                tq.question.correctAnswer,
              ]),
            )
          : null,
    };
  }

  private reorderOptions(
    question: Question,
    order: string[] | undefined,
  ): unknown {
    if (!question.options) return null;
    if (
      (question.type === 'MCQ_SINGLE' || question.type === 'MCQ_MULTIPLE') &&
      order
    ) {
      const options = question.options as unknown as McqOption[];
      const byId = new Map(options.map((o) => [o.id, o]));
      return order.map((id) => byId.get(id)).filter(Boolean);
    }
    if (question.type === 'MATCHING' && order) {
      const options = question.options as unknown as {
        left: McqOption[];
        right: McqOption[];
      };
      const byId = new Map(options.right.map((o) => [o.id, o]));
      return {
        left: options.left,
        right: order.map((id) => byId.get(id)).filter(Boolean),
      };
    }
    return question.options;
  }

  // -------------------------------------------------------------------
  // Answer auto-save
  // -------------------------------------------------------------------

  async saveAnswer(attemptId: string, dto: SaveAnswerDto, user: RequestUser) {
    const attempt = await this.prisma.cBTAttempt.findUnique({
      where: { id: attemptId },
      include: { test: { select: { timeLimitMinutes: true } } },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.studentId !== user.id) {
      throw new ForbiddenException('This is not your attempt');
    }
    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This attempt has already been submitted');
    }
    // Server-side time enforcement — never trust the client's clock.
    const deadline =
      attempt.startedAt.getTime() +
      attempt.test.timeLimitMinutes * 60_000 +
      GRACE_MS;
    if (Date.now() > deadline) {
      throw new BadRequestException('Time is up for this attempt');
    }

    const onTest = await this.prisma.cBTTestQuestion.findUnique({
      where: {
        testId_questionId: {
          testId: attempt.testId,
          questionId: dto.questionId,
        },
      },
    });
    if (!onTest) {
      throw new BadRequestException('That question is not on this test');
    }

    return this.prisma.cBTAnswer.upsert({
      where: {
        attemptId_questionId: { attemptId, questionId: dto.questionId },
      },
      update: {
        answer: dto.answer as Prisma.InputJsonValue,
        answeredAt: new Date(),
      },
      create: {
        attemptId,
        questionId: dto.questionId,
        answer: dto.answer as Prisma.InputJsonValue,
      },
    });
  }

  // -------------------------------------------------------------------
  // Submit + auto-grade
  // -------------------------------------------------------------------

  async submit(attemptId: string, user: RequestUser) {
    const attempt = await this.prisma.cBTAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.studentId !== user.id) {
      throw new ForbiddenException('This is not your attempt');
    }
    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This attempt has already been submitted');
    }
    await this.finalizeAttempt(attemptId, 'SUBMITTED');
    return this.getForOwner(attemptId, user);
  }

  /**
   * The real time-up enforcement (docs/17 §3): a minutely sweep
   * auto-submits any IN_PROGRESS attempt past its limit — a closed laptop
   * or dead battery can't leave an attempt open forever.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sweepExpiredAttempts(): Promise<void> {
    const inProgress = await this.prisma.cBTAttempt.findMany({
      where: { status: 'IN_PROGRESS' },
      include: { test: { select: { timeLimitMinutes: true } } },
    });
    const now = Date.now();
    for (const attempt of inProgress) {
      const deadline =
        attempt.startedAt.getTime() +
        attempt.test.timeLimitMinutes * 60_000 +
        GRACE_MS;
      if (now > deadline) {
        try {
          await this.finalizeAttempt(attempt.id, 'AUTO_SUBMITTED');
          this.logger.log(`Auto-submitted expired attempt ${attempt.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to auto-submit attempt ${attempt.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    }
  }

  /** Grade every objective answer; essays stay null. Finalize if nothing is pending. */
  private async finalizeAttempt(
    attemptId: string,
    status: 'SUBMITTED' | 'AUTO_SUBMITTED',
  ): Promise<void> {
    const attempt = await this.prisma.cBTAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: true,
        test: { include: { questions: { include: { question: true } } } },
      },
    });
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;

    const answerByQuestion = new Map(
      attempt.answers.map((a) => [a.questionId, a]),
    );

    let hasUngradedEssay = false;
    for (const tq of attempt.test.questions) {
      const answer = answerByQuestion.get(tq.questionId);
      if (tq.question.type === 'ESSAY') {
        // Unanswered essays score 0; answered ones await manual grading.
        if (answer && answer.score === null) hasUngradedEssay = true;
        continue;
      }
      const score = answer
        ? this.gradeObjective(tq.question, answer.answer) * tq.points
        : 0;
      if (answer) {
        await this.prisma.cBTAnswer.update({
          where: { id: answer.id },
          data: { score },
        });
      }
    }

    await this.prisma.cBTAttempt.update({
      where: { id: attemptId },
      data: { status, submittedAt: new Date() },
    });

    if (!hasUngradedEssay) {
      await this.finalizeScore(attemptId);
    }
  }

  /** 1 for correct, 0 otherwise (fractional credit is out of scope for Phase 2). */
  private gradeObjective(question: Question, answer: unknown): number {
    const correct = question.correctAnswer as unknown;
    if (correct === null || correct === undefined) return 0;
    switch (question.type) {
      case 'MCQ_SINGLE':
        return answer === correct ? 1 : 0;
      case 'TRUE_FALSE':
        return answer === correct ? 1 : 0;
      case 'MCQ_MULTIPLE': {
        // Set equality.
        if (!Array.isArray(answer) || !Array.isArray(correct)) return 0;
        const a = new Set(answer as string[]);
        const c = new Set(correct as string[]);
        if (a.size !== c.size) return 0;
        for (const item of a) if (!c.has(item)) return 0;
        return 1;
      }
      case 'FILL_BLANK': {
        // Fuzzy: case-insensitive, trimmed, against any accepted variant.
        if (typeof answer !== 'string') return 0;
        const needle = answer.trim().toLowerCase();
        const accepted = Array.isArray(correct)
          ? (correct as string[])
          : typeof correct === 'string'
            ? [correct]
            : [];
        return accepted.some((v) => v.trim().toLowerCase() === needle) ? 1 : 0;
      }
      case 'MATCHING': {
        // Pair equality: answer and correct are {leftId: rightId} maps.
        if (
          typeof answer !== 'object' ||
          answer === null ||
          typeof correct !== 'object'
        ) {
          return 0;
        }
        const a = answer as Record<string, string>;
        const c = correct as Record<string, string>;
        const keys = Object.keys(c);
        if (Object.keys(a).length !== keys.length) return 0;
        return keys.every((k) => a[k] === c[k]) ? 1 : 0;
      }
      default:
        return 0;
    }
  }

  /** Sum the per-answer scores, stamp gradedAt, and feed the results engine if configured. */
  private async finalizeScore(attemptId: string): Promise<void> {
    const attempt = await this.prisma.cBTAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: true,
        test: { include: { assessmentComponent: true, classSubject: true } },
      },
    });
    if (!attempt) return;

    const total = attempt.answers.reduce((sum, a) => sum + (a.score ?? 0), 0);
    await this.prisma.cBTAttempt.update({
      where: { id: attemptId },
      data: { score: total, gradedAt: new Date() },
    });

    // docs/17 §9 — formal-component tests write into Stage 5's Score table.
    const { test } = attempt;
    if (test.assessmentComponentId && !test.isMockPractice) {
      const component = test.assessmentComponent!;
      // A locked ScoreSubmission means the broadsheet pipeline has moved
      // on — writing under it would corrupt an approved dataset.
      const submission = await this.prisma.scoreSubmission.findUnique({
        where: {
          classSubjectId_termId: {
            classSubjectId: test.classSubjectId,
            termId: component.termId,
          },
        },
      });
      if (submission?.locked) {
        this.logger.warn(
          `Skipping Score write for attempt ${attemptId} — scores for this class/term are locked`,
        );
        return;
      }
      const scaled =
        attempt.maxScore > 0
          ? Math.round((total / attempt.maxScore) * component.maxScore * 100) /
            100
          : 0;
      await this.prisma.score.upsert({
        where: {
          studentId_classSubjectId_termId_assessmentComponentId: {
            studentId: attempt.studentId,
            classSubjectId: test.classSubjectId,
            termId: component.termId,
            assessmentComponentId: component.id,
          },
        },
        update: { score: scaled },
        create: {
          studentId: attempt.studentId,
          classSubjectId: test.classSubjectId,
          termId: component.termId,
          assessmentComponentId: component.id,
          score: scaled,
          enteredByStaffId: test.createdByStaffId,
        },
      });
    }
  }

  // -------------------------------------------------------------------
  // Essay grading
  // -------------------------------------------------------------------

  /** Attempts + ungraded-essay answers for the teacher's grading queue. */
  async listAttemptsForGrading(testId: string, user: RequestUser) {
    const test = await this.prisma.cBTTest.findUnique({
      where: { id: testId },
      include: { questions: { include: { question: true } } },
    });
    if (!test) throw new NotFoundException('Test not found');
    const isUnscoped =
      user.roles.includes('EXAM_OFFICER') || user.roles.includes('ADMIN');
    if (test.createdByStaffId !== user.id && !isUnscoped) {
      throw new ForbiddenException('You can only view your own tests');
    }

    const essayQuestionIds = new Set(
      test.questions
        .filter((tq) => tq.question.type === 'ESSAY')
        .map((tq) => tq.questionId),
    );
    const attempts = await this.prisma.cBTAttempt.findMany({
      where: { testId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } },
      orderBy: { submittedAt: 'asc' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        answers: true,
      },
    });

    const essayPrompts = new Map(
      test.questions
        .filter((tq) => essayQuestionIds.has(tq.questionId))
        .map((tq) => [
          tq.questionId,
          { prompt: tq.question.prompt, points: tq.points },
        ]),
    );

    return attempts.map((attempt) => ({
      id: attempt.id,
      student: attempt.student,
      status: attempt.status,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      maxScore: attempt.maxScore,
      gradedAt: attempt.gradedAt,
      essayAnswers: attempt.answers
        .filter((a) => essayQuestionIds.has(a.questionId))
        .map((a) => ({
          questionId: a.questionId,
          prompt: essayPrompts.get(a.questionId)?.prompt ?? '',
          points: essayPrompts.get(a.questionId)?.points ?? 1,
          answer: a.answer,
          score: a.score,
          feedback: a.feedback,
        })),
    }));
  }

  async gradeEssay(attemptId: string, dto: GradeEssayDto, user: RequestUser) {
    const attempt = await this.prisma.cBTAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: { include: { questions: { include: { question: true } } } },
        answers: true,
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status === 'IN_PROGRESS') {
      throw new BadRequestException('This attempt has not been submitted yet');
    }

    // Same ownership rule as test creation.
    const isUnscoped =
      user.roles.includes('EXAM_OFFICER') || user.roles.includes('ADMIN');
    if (attempt.test.createdByStaffId !== user.id && !isUnscoped) {
      const term = await this.prisma.term.findFirst({
        where: { isCurrent: true },
      });
      const assignment = term
        ? await this.prisma.teacherAssignment.findFirst({
            where: {
              staffId: user.id,
              classSubjectId: attempt.test.classSubjectId,
              termId: term.id,
            },
          })
        : null;
      if (!assignment) {
        throw new ForbiddenException(
          'You are not assigned to this class/subject',
        );
      }
    }

    const testQuestion = attempt.test.questions.find(
      (tq) => tq.questionId === dto.questionId,
    );
    if (!testQuestion || testQuestion.question.type !== 'ESSAY') {
      throw new BadRequestException(
        'That question is not an essay question on this test',
      );
    }
    if (dto.score > testQuestion.points) {
      throw new BadRequestException(
        `Score cannot exceed this question's ${testQuestion.points} points`,
      );
    }
    const answer = attempt.answers.find((a) => a.questionId === dto.questionId);
    if (!answer) {
      throw new NotFoundException('The student did not answer this question');
    }

    await this.prisma.cBTAnswer.update({
      where: { id: answer.id },
      data: { score: dto.score, feedback: dto.feedback?.trim() || null },
    });

    // If that was the last ungraded essay, finalize and release.
    const remaining = await this.prisma.cBTAnswer.count({
      where: {
        attemptId,
        score: null,
        questionId: {
          in: attempt.test.questions
            .filter((tq) => tq.question.type === 'ESSAY')
            .map((tq) => tq.questionId),
        },
      },
    });
    if (remaining === 0 && attempt.gradedAt === null) {
      await this.finalizeScore(attemptId);
    }

    return this.listAttemptsForGrading(attempt.testId, user);
  }

  // -------------------------------------------------------------------
  // Mock history (docs/17 §7)
  // -------------------------------------------------------------------

  async getMockHistory(studentId: string, user: RequestUser) {
    if (user.userType === 'STUDENT' && user.id !== studentId) {
      throw new ForbiddenException('You can only view your own mock history');
    }
    const attempts = await this.prisma.cBTAttempt.findMany({
      where: {
        studentId,
        test: { isMockPractice: true },
        status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
        gradedAt: { not: null },
      },
      orderBy: { startedAt: 'asc' },
      include: {
        test: {
          select: {
            title: true,
            classSubject: { select: { subject: { select: { name: true } } } },
          },
        },
      },
    });
    return attempts.map((a) => ({
      attemptId: a.id,
      testTitle: a.test.title,
      subjectName: a.test.classSubject.subject.name,
      takenAt: a.startedAt,
      score: a.score,
      maxScore: a.maxScore,
      percentage:
        a.maxScore > 0
          ? Math.round(((a.score ?? 0) / a.maxScore) * 1000) / 10
          : 0,
    }));
  }
}
