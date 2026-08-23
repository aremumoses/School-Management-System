import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CBTTest, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import {
  AddTestQuestionsDto,
  AutoAssembleDto,
  CreateCBTTestDto,
  UpdateCBTTestDto,
} from './dto/cbt.dto';

const TEST_INCLUDE = {
  classSubject: { include: { subject: true, class: true } },
  createdBy: { select: { firstName: true, lastName: true } },
  _count: { select: { questions: true, attempts: true } },
} as const;

/** Derived lifecycle status — never stored. */
export function testStatus(test: {
  availableFrom: Date;
  availableTo: Date;
  questionCount: number;
}): 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED' {
  if (test.questionCount === 0) return 'DRAFT';
  const now = Date.now();
  if (now < test.availableFrom.getTime()) return 'SCHEDULED';
  if (now > test.availableTo.getTime()) return 'CLOSED';
  return 'OPEN';
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

@Injectable()
export class CBTTestsService {
  constructor(private readonly prisma: PrismaService) {}

  private isUnscoped(user: RequestUser): boolean {
    return user.roles.includes('EXAM_OFFICER') || user.roles.includes('ADMIN');
  }

  /** Same TeacherAssignment check as every other teacher-authored content. */
  private async assertAssigned(
    staffId: string,
    classSubjectId: string,
  ): Promise<void> {
    const term = await this.prisma.term.findFirst({
      where: { isCurrent: true },
    });
    if (!term) throw new BadRequestException('No current term is set');
    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: { staffId, classSubjectId, termId: term.id },
    });
    if (!assignment) {
      throw new ForbiddenException(
        'You are not assigned to teach this class/subject this term',
      );
    }
  }

  async create(dto: CreateCBTTestDto, user: RequestUser): Promise<CBTTest> {
    if (!this.isUnscoped(user)) {
      await this.assertAssigned(user.id, dto.classSubjectId);
    }
    const from = new Date(dto.availableFrom);
    const to = new Date(dto.availableTo);
    if (to.getTime() <= from.getTime()) {
      throw new BadRequestException('availableTo must be after availableFrom');
    }
    if (dto.isMockPractice && dto.assessmentComponentId) {
      throw new BadRequestException(
        'A mock-practice test never feeds the results engine — drop the assessmentComponentId',
      );
    }
    if (dto.assessmentComponentId) {
      const component = await this.prisma.assessmentComponent.findUnique({
        where: { id: dto.assessmentComponentId },
      });
      if (!component) {
        throw new NotFoundException('Assessment component not found');
      }
    }

    return this.prisma.cBTTest.create({
      data: {
        title: dto.title.trim(),
        classSubjectId: dto.classSubjectId,
        timeLimitMinutes: dto.timeLimitMinutes,
        attemptsAllowed: dto.attemptsAllowed ?? 1,
        availableFrom: from,
        availableTo: to,
        passMark: dto.passMark ?? 50,
        instantRelease: dto.instantRelease ?? true,
        showCorrectAnswersAfter: dto.showCorrectAnswersAfter ?? false,
        isMockPractice: dto.isMockPractice ?? false,
        assessmentComponentId: dto.assessmentComponentId ?? null,
        createdByStaffId: user.id,
      },
      include: TEST_INCLUDE,
    });
  }

  async update(
    id: string,
    dto: UpdateCBTTestDto,
    user: RequestUser,
  ): Promise<CBTTest> {
    const test = await this.getRawOrThrow(id);
    if (test.createdByStaffId !== user.id && !this.isUnscoped(user)) {
      throw new ForbiddenException('You can only edit your own tests');
    }
    return this.prisma.cBTTest.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.timeLimitMinutes !== undefined && {
          timeLimitMinutes: dto.timeLimitMinutes,
        }),
        ...(dto.attemptsAllowed !== undefined && {
          attemptsAllowed: dto.attemptsAllowed,
        }),
        ...(dto.availableFrom !== undefined && {
          availableFrom: new Date(dto.availableFrom),
        }),
        ...(dto.availableTo !== undefined && {
          availableTo: new Date(dto.availableTo),
        }),
        ...(dto.passMark !== undefined && { passMark: dto.passMark }),
        ...(dto.instantRelease !== undefined && {
          instantRelease: dto.instantRelease,
        }),
        ...(dto.showCorrectAnswersAfter !== undefined && {
          showCorrectAnswersAfter: dto.showCorrectAnswersAfter,
        }),
      },
      include: TEST_INCLUDE,
    });
  }

  /**
   * Teachers: their own tests. EO/Admin: all. Students: the tests for
   * their class, annotated with their own attempts (the take/resume/
   * result entry points all hang off this).
   */
  async list(user: RequestUser) {
    if (user.userType === 'STUDENT') {
      return this.listForStudent(user.id);
    }
    const where: Prisma.CBTTestWhereInput = this.isUnscoped(user)
      ? {}
      : { createdByStaffId: user.id };
    const tests = await this.prisma.cBTTest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: TEST_INCLUDE,
    });
    return tests.map((t) => ({
      ...t,
      status: testStatus({
        availableFrom: t.availableFrom,
        availableTo: t.availableTo,
        questionCount: t._count.questions,
      }),
    }));
  }

  private async listForStudent(studentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, status: 'ACTIVE' },
    });
    if (!enrollment) return [];

    const tests = await this.prisma.cBTTest.findMany({
      where: { classSubject: { classId: enrollment.classId } },
      orderBy: { availableFrom: 'desc' },
      include: {
        ...TEST_INCLUDE,
        attempts: {
          where: { studentId },
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            status: true,
            startedAt: true,
            submittedAt: true,
            score: true,
            maxScore: true,
            gradedAt: true,
          },
        },
      },
    });

    return tests.map((t) => {
      const released =
        t.instantRelease ||
        // essay tests release on grading (see attempts service)
        false;
      return {
        id: t.id,
        title: t.title,
        classSubject: t.classSubject,
        timeLimitMinutes: t.timeLimitMinutes,
        attemptsAllowed: t.attemptsAllowed,
        availableFrom: t.availableFrom,
        availableTo: t.availableTo,
        passMark: t.passMark,
        isMockPractice: t.isMockPractice,
        status: testStatus({
          availableFrom: t.availableFrom,
          availableTo: t.availableTo,
          questionCount: t._count.questions,
        }),
        questionCount: t._count.questions,
        myAttempts: t.attempts.map((a) => ({
          id: a.id,
          status: a.status,
          startedAt: a.startedAt,
          // Score exposure is decided properly in the attempts service;
          // the list only reveals it once graded AND releasable.
          score: a.gradedAt && released ? a.score : null,
          maxScore: a.maxScore,
          gradedAt: a.gradedAt,
        })),
      };
    });
  }

  async getRawOrThrow(id: string) {
    const test = await this.prisma.cBTTest.findUnique({
      where: { id },
      include: TEST_INCLUDE,
    });
    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  /** Full detail for the owner/reviewer — questions with correct answers. */
  async getForBuilder(id: string, user: RequestUser) {
    const test = await this.getRawOrThrow(id);
    if (test.createdByStaffId !== user.id && !this.isUnscoped(user)) {
      throw new ForbiddenException('You can only view your own tests');
    }
    const questions = await this.prisma.cBTTestQuestion.findMany({
      where: { testId: id },
      orderBy: { order: 'asc' },
      include: { question: { include: { subject: true } } },
    });
    return {
      ...test,
      status: testStatus({
        availableFrom: test.availableFrom,
        availableTo: test.availableTo,
        questionCount: test._count.questions,
      }),
      questions,
    };
  }

  async addQuestions(id: string, dto: AddTestQuestionsDto, user: RequestUser) {
    const test = await this.getRawOrThrow(id);
    if (test.createdByStaffId !== user.id && !this.isUnscoped(user)) {
      throw new ForbiddenException('You can only edit your own tests');
    }
    await this.assertNoAttempts(id);

    const questions = await this.prisma.question.findMany({
      where: { id: { in: dto.questionIds } },
    });
    if (questions.length !== dto.questionIds.length) {
      throw new BadRequestException('One or more questions do not exist');
    }
    const unapproved = questions.filter((q) => q.status !== 'APPROVED');
    if (unapproved.length > 0) {
      throw new BadRequestException(
        'Only APPROVED bank questions can be added to a test',
      );
    }

    const existingCount = await this.prisma.cBTTestQuestion.count({
      where: { testId: id },
    });
    await this.prisma.cBTTestQuestion.createMany({
      data: dto.questionIds.map((questionId, index) => ({
        testId: id,
        questionId,
        order: existingCount + index + 1,
        points: dto.points ?? 1,
      })),
      skipDuplicates: true,
    });
    return this.getForBuilder(id, user);
  }

  async removeQuestion(id: string, questionId: string, user: RequestUser) {
    const test = await this.getRawOrThrow(id);
    if (test.createdByStaffId !== user.id && !this.isUnscoped(user)) {
      throw new ForbiddenException('You can only edit your own tests');
    }
    await this.assertNoAttempts(id);
    await this.prisma.cBTTestQuestion.deleteMany({
      where: { testId: id, questionId },
    });
  }

  /**
   * Rule-based assembly (docs/17 §2): random sample of APPROVED bank
   * questions per rule — rejected outright if the bank can't satisfy a
   * rule, never silently assembling a shorter test.
   */
  async autoAssemble(id: string, dto: AutoAssembleDto, user: RequestUser) {
    const test = await this.getRawOrThrow(id);
    if (test.createdByStaffId !== user.id && !this.isUnscoped(user)) {
      throw new ForbiddenException('You can only edit your own tests');
    }
    await this.assertNoAttempts(id);

    const alreadyOnTest = await this.prisma.cBTTestQuestion.findMany({
      where: { testId: id },
      select: { questionId: true },
    });
    const excluded = new Set(alreadyOnTest.map((q) => q.questionId));
    const picked: string[] = [];

    for (const rule of dto.rules) {
      const pool = await this.prisma.question.findMany({
        where: {
          status: 'APPROVED',
          subjectId: test.classSubject.subjectId,
          topic: { contains: rule.topic, mode: 'insensitive' },
          ...(rule.difficulty ? { difficulty: rule.difficulty } : {}),
          type: { not: 'ESSAY' },
          id: { notIn: [...excluded, ...picked] },
        },
        select: { id: true },
      });
      if (pool.length < rule.count) {
        throw new BadRequestException(
          `The bank only has ${pool.length} approved "${rule.topic}"${rule.difficulty ? ` (${rule.difficulty})` : ''} questions — ${rule.count} requested. Add more questions or lower the count.`,
        );
      }
      picked.push(...shuffle(pool.map((q) => q.id)).slice(0, rule.count));
    }

    const existingCount = alreadyOnTest.length;
    await this.prisma.cBTTestQuestion.createMany({
      data: picked.map((questionId, index) => ({
        testId: id,
        questionId,
        order: existingCount + index + 1,
        points: dto.points ?? 1,
      })),
    });
    return this.getForBuilder(id, user);
  }

  /** Once anyone has an attempt, the paper is frozen. */
  private async assertNoAttempts(testId: string): Promise<void> {
    const attempts = await this.prisma.cBTAttempt.count({
      where: { testId },
    });
    if (attempts > 0) {
      throw new BadRequestException(
        'This test already has attempts — its questions can no longer change',
      );
    }
  }

  /** Phase-2 slice of §8: distribution/average/pass-rate, no item analysis. */
  async getStats(id: string, user: RequestUser) {
    const test = await this.getRawOrThrow(id);
    if (test.createdByStaffId !== user.id && !this.isUnscoped(user)) {
      throw new ForbiddenException(
        'You can only view stats for your own tests',
      );
    }

    const attempts = await this.prisma.cBTAttempt.findMany({
      where: {
        testId: id,
        status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
        gradedAt: { not: null },
        score: { not: null },
      },
      select: { score: true, maxScore: true },
    });

    const percentages = attempts.map((a) =>
      a.maxScore > 0 ? (a.score! / a.maxScore) * 100 : 0,
    );
    const buckets = [
      { range: '0–39', min: 0, max: 39.99 },
      { range: '40–49', min: 40, max: 49.99 },
      { range: '50–59', min: 50, max: 59.99 },
      { range: '60–69', min: 60, max: 69.99 },
      { range: '70–100', min: 70, max: 100 },
    ];

    return {
      testId: id,
      title: test.title,
      attemptCount: percentages.length,
      average:
        percentages.length > 0
          ? Math.round(
              (percentages.reduce((s, p) => s + p, 0) / percentages.length) *
                10,
            ) / 10
          : null,
      passRate:
        percentages.length > 0
          ? Math.round(
              (percentages.filter((p) => p >= test.passMark).length /
                percentages.length) *
                1000,
            ) / 10
          : null,
      passMark: test.passMark,
      distribution: buckets.map((bucket) => ({
        range: bucket.range,
        count: percentages.filter((p) => p >= bucket.min && p <= bucket.max)
          .length,
      })),
    };
  }
}
