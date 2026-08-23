import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type {
  AssessmentComponent,
  Arm,
  ClassTermResultStatus,
  ConductDomain,
  ResultStage,
  Score,
} from '@prisma/client';
import { AssessmentService } from '../assessment/assessment.service';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { GradingService } from '../../common/grading/grading.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RankingService } from '../../common/ranking/ranking.service';
import type { RequestUser } from '../../common/types/auth.types';
import { ScoresService } from '../scores/scores.service';
import {
  AFFECTIVE_CATEGORIES,
  PSYCHOMOTOR_CATEGORIES,
} from './conduct-categories';
import { PrincipalCommentDto } from './dto/principal-comment.dto';
import { ReturnResultDto } from './dto/return-result.dto';
import { SubmitConductDto } from './dto/submit-conduct.dto';
import {
  REPORT_CARDS_QUEUE,
  ReportCardJobData,
} from './report-card/report-card.constants';

export interface SubjectResultRow {
  classSubjectId: string;
  subjectId: string;
  subjectName: string;
  componentScores: { name: string; score: number | null; maxScore: number }[];
  total: number;
  grade: string;
  remark: string;
  positionInSubject: number;
  classAverageForSubject: number;
}

export interface StudentBroadsheetRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  subjects: SubjectResultRow[];
  totalObtainable: number;
  totalScored: number;
  overallAverage: number;
  overallPosition: number;
  classSize: number;
  formTeacherComment: string | null;
  principalComment: string | null;
}

export interface SubjectLockStatus {
  classSubjectId: string;
  subjectName: string;
  locked: boolean;
}

export interface ResultStatusResponse {
  stage: ResultStage;
  returnReason: string | null;
  publishedAt: Date | null;
  allSubjectsLocked: boolean;
  // Every subject taught at this class level, locked or not — lets a
  // status-chip UI show "submitted" alongside "outstanding" in one grid.
  subjects: SubjectLockStatus[];
  outstandingSubjects: SubjectLockStatus[];
}

export interface StudentConductRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  ratings: { domain: ConductDomain; category: string; score: number }[];
  formTeacherComment: string | null;
}

export interface ReportCardData {
  school: {
    name: string;
    logoUrl: string | null;
    address: string | null;
    motto: string | null;
    registrationNumber: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    photoUrl: string | null;
    gender: string;
  };
  className: string;
  armName: string;
  termName: string;
  sessionName: string;
  subjects: SubjectResultRow[];
  componentNames: string[];
  totalObtainable: number;
  totalScored: number;
  overallAverage: number;
  overallPosition: number;
  classSize: number;
  attendance: { totalDays: number; presentDays: number; absentDays: number };
  affectiveRatings: { category: string; score: number }[];
  psychomotorRatings: { category: string; score: number }[];
  formTeacherComment: string | null;
  principalComment: string | null;
  nextTermResumptionDate: string | null;
}

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessmentService: AssessmentService,
    private readonly scoresService: ScoresService,
    private readonly gradingService: GradingService,
    private readonly rankingService: RankingService,
    private readonly auditLog: AuditLogService,
    @InjectQueue(REPORT_CARDS_QUEUE)
    private readonly reportCardsQueue: Queue<ReportCardJobData>,
  ) {}

  async getStatus(
    armId: string,
    termId: string,
  ): Promise<ResultStatusResponse> {
    const arm = await this.getArmOrThrow(armId);
    const status = await this.getOrCreateStatus(armId, termId);
    const { subjects, allLocked } = await this.getSubjectLockStatus(
      arm.classId,
      termId,
    );
    return {
      stage: status.stage,
      returnReason: status.returnReason,
      publishedAt: status.publishedAt,
      allSubjectsLocked: allLocked,
      subjects,
      outstandingSubjects: subjects.filter((s) => !s.locked),
    };
  }

  /**
   * Every active student's existing conduct ratings + form comment in one
   * call — lets the Class Teacher's ratings form pre-fill with whatever
   * was already submitted instead of always looking blank on revisit.
   */
  async getConductRatings(
    armId: string,
    termId: string,
  ): Promise<StudentConductRow[]> {
    await this.getArmOrThrow(armId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { armId, termId, status: 'ACTIVE' },
      include: { student: true },
      orderBy: [
        { student: { lastName: 'asc' } },
        { student: { firstName: 'asc' } },
      ],
    });
    const studentIds = enrollments.map((e) => e.studentId);

    const [ratings, results] = await Promise.all([
      this.prisma.conductRating.findMany({
        where: { studentId: { in: studentIds }, termId },
      }),
      this.prisma.studentTermResult.findMany({
        where: { studentId: { in: studentIds }, termId },
      }),
    ]);
    const ratingsByStudent = new Map<
      string,
      { domain: ConductDomain; category: string; score: number }[]
    >();
    for (const rating of ratings) {
      const list = ratingsByStudent.get(rating.studentId) ?? [];
      list.push({
        domain: rating.domain,
        category: rating.category,
        score: rating.score,
      });
      ratingsByStudent.set(rating.studentId, list);
    }
    const resultByStudent = new Map(results.map((r) => [r.studentId, r]));

    return enrollments.map((enrollment) => ({
      studentId: enrollment.studentId,
      firstName: enrollment.student.firstName,
      lastName: enrollment.student.lastName,
      admissionNumber: enrollment.student.admissionNumber,
      ratings: ratingsByStudent.get(enrollment.studentId) ?? [],
      formTeacherComment:
        resultByStudent.get(enrollment.studentId)?.formTeacherComment ?? null,
    }));
  }

  async submitConduct(
    armId: string,
    termId: string,
    studentId: string,
    dto: SubmitConductDto,
    user: RequestUser,
  ): Promise<void> {
    const arm = await this.getArmOrThrow(armId);
    if (!user.roles.includes('ADMIN')) {
      if (
        !user.roles.includes('CLASS_TEACHER') ||
        arm.classTeacherId !== user.id
      ) {
        throw new ForbiddenException(
          "Only this arm's Class Teacher (or an Admin) can submit conduct ratings",
        );
      }
    }
    await this.assertEditableStage(armId, termId);
    await this.assertActivelyEnrolled(studentId, armId, termId);

    for (const rating of dto.ratings) {
      const allowed: readonly string[] =
        rating.domain === 'AFFECTIVE'
          ? AFFECTIVE_CATEGORIES
          : PSYCHOMOTOR_CATEGORIES;
      if (!allowed.includes(rating.category)) {
        throw new BadRequestException(
          `"${rating.category}" is not a valid ${rating.domain} category`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const rating of dto.ratings) {
        await tx.conductRating.upsert({
          where: {
            studentId_termId_domain_category: {
              studentId,
              termId,
              domain: rating.domain,
              category: rating.category,
            },
          },
          update: { score: rating.score },
          create: {
            studentId,
            termId,
            domain: rating.domain,
            category: rating.category,
            score: rating.score,
          },
        });
      }

      if (dto.formTeacherComment !== undefined) {
        await tx.studentTermResult.upsert({
          where: { studentId_termId: { studentId, termId } },
          update: { formTeacherComment: dto.formTeacherComment },
          create: {
            studentId,
            termId,
            armId,
            formTeacherComment: dto.formTeacherComment,
          },
        });
      }
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'CONDUCT_SUBMIT',
      entityType: 'ConductRating',
      entityId: studentId,
      afterJson: {
        termId,
        ratings: dto.ratings,
        formTeacherComment: dto.formTeacherComment,
      },
    });
  }

  async setPrincipalComment(
    armId: string,
    termId: string,
    studentId: string,
    dto: PrincipalCommentDto,
    user: RequestUser,
  ): Promise<void> {
    await this.assertEditableStage(armId, termId);
    await this.assertActivelyEnrolled(studentId, armId, termId);
    const existing = await this.prisma.studentTermResult.findUnique({
      where: { studentId_termId: { studentId, termId } },
    });
    await this.prisma.studentTermResult.upsert({
      where: { studentId_termId: { studentId, termId } },
      update: { principalComment: dto.principalComment },
      create: {
        studentId,
        termId,
        armId,
        principalComment: dto.principalComment,
      },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'PRINCIPAL_COMMENT_SET',
      entityType: 'StudentTermResult',
      entityId: studentId,
      beforeJson: { principalComment: existing?.principalComment ?? null },
      afterJson: { principalComment: dto.principalComment },
    });
  }

  async getBroadsheet(
    armId: string,
    termId: string,
  ): Promise<{ status: ResultStatusResponse; rows: StudentBroadsheetRow[] }> {
    const status = await this.getStatus(armId, termId);
    const rows = await this.computeBroadsheet(armId, termId);
    return { status, rows };
  }

  async collate(
    armId: string,
    termId: string,
    user: RequestUser,
  ): Promise<StudentBroadsheetRow[]> {
    const arm = await this.getArmOrThrow(armId);
    const { subjects, allLocked } = await this.getSubjectLockStatus(
      arm.classId,
      termId,
    );
    if (subjects.length === 0) {
      throw new BadRequestException(
        'This class has no subjects mapped yet — map at least one subject before collating.',
      );
    }
    if (!allLocked) {
      const outstanding = subjects
        .filter((s) => !s.locked)
        .map((s) => s.subjectName)
        .join(', ');
      throw new BadRequestException(
        `Not all subjects are submitted and locked yet: ${outstanding}`,
      );
    }

    const status = await this.getOrCreateStatus(armId, termId);
    if (status.stage !== 'SCORES_IN_PROGRESS' && status.stage !== 'RETURNED') {
      throw new BadRequestException(
        `Cannot collate from stage ${status.stage}`,
      );
    }

    const rows = await this.computeBroadsheet(armId, termId);
    await this.persistBroadsheet(armId, termId, rows);

    await this.prisma.classTermResultStatus.update({
      where: { id: status.id },
      data: { stage: 'PENDING_APPROVAL', returnReason: null },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'RESULTS_COLLATED',
      entityType: 'ClassTermResultStatus',
      entityId: status.id,
      beforeJson: { stage: status.stage },
      afterJson: { stage: 'PENDING_APPROVAL' },
    });

    return rows;
  }

  async approve(
    armId: string,
    termId: string,
    user: RequestUser,
  ): Promise<ClassTermResultStatus> {
    const status = await this.getStatusOrThrow(armId, termId);
    if (status.stage !== 'PENDING_APPROVAL') {
      throw new BadRequestException(
        `Cannot approve from stage ${status.stage}`,
      );
    }
    const updated = await this.prisma.classTermResultStatus.update({
      where: { id: status.id },
      data: { stage: 'APPROVED', returnReason: null },
    });
    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'RESULTS_APPROVED',
      entityType: 'ClassTermResultStatus',
      entityId: status.id,
      beforeJson: { stage: 'PENDING_APPROVAL' },
      afterJson: { stage: 'APPROVED' },
    });
    return updated;
  }

  // APPROVED/PUBLISHED are included alongside PENDING_APPROVAL — without
  // them there was no way back once a result was approved or published:
  // collate() only accepts SCORES_IN_PROGRESS/RETURNED, so a mistake found
  // post-approval had no formal correction path at all. Reopening a
  // PUBLISHED result also re-hides it from students/parents immediately
  // (getReportCardDataForViewer's gate checks live stage, not a cached
  // flag), exactly as a "this needs fixing" state should.
  private static readonly RETURNABLE_STAGES: ResultStage[] = [
    'PENDING_APPROVAL',
    'APPROVED',
    'PUBLISHED',
  ];

  async returnResult(
    armId: string,
    termId: string,
    dto: ReturnResultDto,
    user: RequestUser,
  ): Promise<ClassTermResultStatus> {
    const status = await this.getStatusOrThrow(armId, termId);
    if (!ResultsService.RETURNABLE_STAGES.includes(status.stage)) {
      throw new BadRequestException(`Cannot return from stage ${status.stage}`);
    }
    const updated = await this.prisma.classTermResultStatus.update({
      where: { id: status.id },
      data: { stage: 'RETURNED', returnReason: dto.reason },
    });
    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'RESULTS_RETURNED',
      entityType: 'ClassTermResultStatus',
      entityId: status.id,
      beforeJson: { stage: status.stage },
      afterJson: { stage: 'RETURNED', reason: dto.reason },
    });
    return updated;
  }

  async publish(
    armId: string,
    termId: string,
    user: RequestUser,
  ): Promise<ClassTermResultStatus> {
    const status = await this.getStatusOrThrow(armId, termId);
    if (status.stage !== 'APPROVED') {
      throw new BadRequestException(
        `Cannot publish from stage ${status.stage}`,
      );
    }
    const updated = await this.prisma.classTermResultStatus.update({
      where: { id: status.id },
      data: { stage: 'PUBLISHED', publishedAt: new Date() },
    });
    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'RESULTS_PUBLISHED',
      entityType: 'ClassTermResultStatus',
      entityId: status.id,
      beforeJson: { stage: 'APPROVED' },
      afterJson: { stage: 'PUBLISHED' },
    });
    await this.enqueueReportCards(armId, termId);
    return updated;
  }

  async enqueueReportCards(
    armId: string,
    termId: string,
  ): Promise<{ enqueued: number }> {
    await this.getArmOrThrow(armId);
    // publish() is the only normal call path and only reaches this after
    // setting the stage to PUBLISHED — but generate-report-cards is also
    // exposed directly (e.g. to retry a failed/partial batch), so it needs
    // its own gate. Without this, anyone with EXAM_OFFICER/ADMIN could
    // generate official-looking, publicly-linked PDFs straight from
    // provisional, unapproved broadsheet data, well before the approval
    // workflow says the result is final.
    const status = await this.getStatusOrThrow(armId, termId);
    if (status.stage !== 'PUBLISHED') {
      throw new BadRequestException(
        `Cannot generate report cards from stage ${status.stage} — results must be published first.`,
      );
    }
    const enrollments = await this.prisma.enrollment.findMany({
      where: { armId, termId, status: 'ACTIVE' },
    });
    await Promise.all(
      enrollments.map((enrollment) =>
        this.reportCardsQueue.add('generate', {
          studentId: enrollment.studentId,
          armId,
          termId,
        }),
      ),
    );
    return { enqueued: enrollments.length };
  }

  /**
   * The shared per-arm computation behind both the broadsheet endpoint and
   * collation — scores -> percentage totals -> ranked positions/class
   * averages, scoped to this arm's roster (not the whole class level
   * across every arm). Live/idempotent: safe to call repeatedly, including
   * before all subjects are locked (positions just reflect what's in so
   * far).
   */
  async computeBroadsheet(
    armId: string,
    termId: string,
  ): Promise<StudentBroadsheetRow[]> {
    const arm = await this.getArmOrThrow(armId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { armId, termId, status: 'ACTIVE' },
      include: { student: true },
    });
    if (enrollments.length === 0) return [];

    const classSubjects = await this.prisma.classSubject.findMany({
      where: { classId: arm.classId },
      include: { subject: true },
    });
    const studentIds = enrollments.map((e) => e.studentId);
    const scale = await this.gradingService.loadScale();

    const componentsByClassSubject = new Map<string, AssessmentComponent[]>();
    const componentLookups = await Promise.all(
      classSubjects.map((cs) =>
        this.assessmentService
          .getEffectiveComponents(termId, cs.subjectId)
          .then((components) => [cs.id, components] as const),
      ),
    );
    for (const [classSubjectId, components] of componentLookups) {
      componentsByClassSubject.set(classSubjectId, components);
    }

    const allScores = await this.prisma.score.findMany({
      where: {
        termId,
        studentId: { in: studentIds },
        classSubjectId: { in: classSubjects.map((c) => c.id) },
      },
    });
    const scoresByStudentAndSubject = new Map<string, Map<string, Score[]>>();
    for (const score of allScores) {
      const byStudent =
        scoresByStudentAndSubject.get(score.studentId) ??
        new Map<string, Score[]>();
      const list = byStudent.get(score.classSubjectId) ?? [];
      list.push(score);
      byStudent.set(score.classSubjectId, list);
      scoresByStudentAndSubject.set(score.studentId, byStudent);
    }

    // classSubjectId -> studentId -> percentage total for that subject
    const subjectTotals = new Map<string, Map<string, number>>();
    for (const cs of classSubjects) {
      const components = componentsByClassSubject.get(cs.id) ?? [];
      const totalsForSubject = new Map<string, number>();
      for (const studentId of studentIds) {
        const scores =
          scoresByStudentAndSubject.get(studentId)?.get(cs.id) ?? [];
        totalsForSubject.set(
          studentId,
          this.scoresService.computeSubjectPercentage(scores, components),
        );
      }
      subjectTotals.set(cs.id, totalsForSubject);
    }

    const positionsBySubject = new Map<string, Map<string, number>>();
    const classAverageBySubject = new Map<string, number>();
    for (const cs of classSubjects) {
      const totalsForSubject = subjectTotals.get(cs.id)!;
      const entries = studentIds.map((id) => ({
        id,
        score: totalsForSubject.get(id) ?? 0,
      }));
      const ranked = this.rankingService.rank(entries);
      positionsBySubject.set(
        cs.id,
        new Map(ranked.map((r) => [r.id, r.position])),
      );
      const avg = entries.reduce((sum, e) => sum + e.score, 0) / entries.length;
      classAverageBySubject.set(cs.id, avg);
    }

    const overallEntries = studentIds.map((studentId) => {
      const total = classSubjects.reduce(
        (sum, cs) => sum + (subjectTotals.get(cs.id)?.get(studentId) ?? 0),
        0,
      );
      const average =
        classSubjects.length > 0 ? total / classSubjects.length : 0;
      return { id: studentId, score: average };
    });
    const overallRanked = this.rankingService.rank(overallEntries);
    const overallPositionByStudent = new Map(
      overallRanked.map((r) => [r.id, r.position]),
    );

    const existingResults = await this.prisma.studentTermResult.findMany({
      where: { termId, studentId: { in: studentIds } },
    });
    const resultByStudent = new Map(
      existingResults.map((r) => [r.studentId, r]),
    );

    return enrollments.map((enrollment) => {
      const studentId = enrollment.studentId;
      const subjects: SubjectResultRow[] = classSubjects.map((cs) => {
        const components = componentsByClassSubject.get(cs.id) ?? [];
        const scores =
          scoresByStudentAndSubject.get(studentId)?.get(cs.id) ?? [];
        const scoreByComponent = new Map(
          scores.map((s) => [s.assessmentComponentId, s.score]),
        );
        const total = subjectTotals.get(cs.id)?.get(studentId) ?? 0;
        const { grade, remark } = this.gradingService.gradeFromScale(
          total,
          scale,
        );
        return {
          classSubjectId: cs.id,
          subjectId: cs.subjectId,
          subjectName: cs.subject.name,
          componentScores: components.map((c) => ({
            name: c.name,
            score: scoreByComponent.get(c.id) ?? null,
            maxScore: c.maxScore,
          })),
          total,
          grade,
          remark,
          positionInSubject: positionsBySubject.get(cs.id)?.get(studentId) ?? 0,
          classAverageForSubject: classAverageBySubject.get(cs.id) ?? 0,
        };
      });

      const totalScored = subjects.reduce((sum, s) => sum + s.total, 0);
      const overallAverage =
        classSubjects.length > 0 ? totalScored / classSubjects.length : 0;
      const existing = resultByStudent.get(studentId);

      return {
        studentId,
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
        admissionNumber: enrollment.student.admissionNumber,
        subjects,
        totalObtainable: classSubjects.length * 100,
        totalScored,
        overallAverage,
        overallPosition: overallPositionByStudent.get(studentId) ?? 0,
        classSize: enrollments.length,
        formTeacherComment: existing?.formTeacherComment ?? null,
        principalComment: existing?.principalComment ?? null,
      };
    });
  }

  /**
   * The same data the PDF processor renders, but reachable by the
   * student/parent themselves for an on-screen preview — gated so a
   * STUDENT/PARENT can only see it once this arm+term is actually
   * PUBLISHED (docs §4's "scores can be hidden until the term result is
   * fully published"). Staff roles bypass that gate (they need to preview
   * unpublished results while working the approval queue); only their
   * identity is checked.
   */
  async getReportCardDataForViewer(
    studentId: string,
    armId: string,
    termId: string,
    user: RequestUser,
  ): Promise<ReportCardData> {
    await this.assertReportCardAccess(studentId, armId, termId, user);
    return this.buildReportCardData(studentId, armId, termId);
  }

  private async assertReportCardAccess(
    studentId: string,
    armId: string,
    termId: string,
    user: RequestUser,
  ): Promise<void> {
    const privilegedRoles = [
      'ADMIN',
      'VICE_PRINCIPAL',
      'EXAM_OFFICER',
      'HOD',
      'CLASS_TEACHER',
    ];
    if (user.roles.includes('STUDENT')) {
      if (user.id !== studentId) {
        throw new ForbiddenException('You can only view your own report card');
      }
    } else if (user.roles.includes('PARENT')) {
      const link = await this.prisma.studentGuardian.findFirst({
        where: { studentId, guardianId: user.id },
      });
      if (!link) {
        throw new ForbiddenException(
          "You can only view your own ward's report card",
        );
      }
    } else if (user.roles.some((role) => privilegedRoles.includes(role))) {
      return;
    } else {
      throw new ForbiddenException(
        'You do not have access to this report card',
      );
    }

    const status = await this.prisma.classTermResultStatus.findUnique({
      where: { armId_termId: { armId, termId } },
    });
    if (!status || status.stage !== 'PUBLISHED') {
      throw new ForbiddenException(
        "This term's result has not been published yet",
      );
    }
  }

  async buildReportCardData(
    studentId: string,
    armId: string,
    termId: string,
  ): Promise<ReportCardData> {
    const rows = await this.computeBroadsheet(armId, termId);
    const row = rows.find((r) => r.studentId === studentId);
    if (!row) {
      throw new NotFoundException(
        'Student is not actively enrolled in this class/arm this term',
      );
    }

    const [
      student,
      arm,
      term,
      school,
      conductRatings,
      allTerms,
      attendanceRecords,
      defaultComponents,
    ] = await Promise.all([
      this.prisma.student.findUniqueOrThrow({ where: { id: studentId } }),
      this.prisma.arm.findUniqueOrThrow({
        where: { id: armId },
        include: { class: true },
      }),
      this.prisma.term.findUniqueOrThrow({
        where: { id: termId },
        include: { session: true },
      }),
      this.prisma.school.findFirstOrThrow(),
      this.prisma.conductRating.findMany({ where: { studentId, termId } }),
      this.prisma.term.findMany({ orderBy: { startDate: 'asc' } }),
      this.prisma.attendance.findMany({
        where: { studentId, termId, classSubjectId: null },
      }),
      this.assessmentService.listForTerm(termId),
    ]);

    const termIndex = allTerms.findIndex((t) => t.id === termId);
    const nextTerm =
      termIndex >= 0 && termIndex < allTerms.length - 1
        ? allTerms[termIndex + 1]
        : null;

    const presentDays = attendanceRecords.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE',
    ).length;
    const absentDays = attendanceRecords.filter(
      (a) => a.status === 'ABSENT',
    ).length;

    const componentNames = [
      ...new Set(
        defaultComponents
          .filter((c) => c.subjectId === null)
          .map((c) => c.name),
      ),
    ];

    return {
      school: {
        name: school.name,
        logoUrl: school.logoUrl,
        address: school.address,
        motto: school.motto,
        registrationNumber: school.registrationNumber,
        primaryColor: school.documentPrimaryColor ?? '#1D4ED8',
        secondaryColor: school.documentSecondaryColor ?? '#F59E0B',
      },
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        photoUrl: student.photoUrl,
        gender: student.gender,
      },
      className: arm.class.name,
      armName: arm.name,
      termName: term.name,
      sessionName: term.session.name,
      subjects: row.subjects,
      componentNames,
      totalObtainable: row.totalObtainable,
      totalScored: row.totalScored,
      overallAverage: row.overallAverage,
      overallPosition: row.overallPosition,
      classSize: row.classSize,
      attendance: {
        totalDays: attendanceRecords.length,
        presentDays,
        absentDays,
      },
      affectiveRatings: conductRatings
        .filter((r) => r.domain === 'AFFECTIVE')
        .map((r) => ({ category: r.category, score: r.score })),
      psychomotorRatings: conductRatings
        .filter((r) => r.domain === 'PSYCHOMOTOR')
        .map((r) => ({ category: r.category, score: r.score })),
      formTeacherComment: row.formTeacherComment,
      principalComment: row.principalComment,
      nextTermResumptionDate: nextTerm
        ? nextTerm.startDate.toISOString().slice(0, 10)
        : null,
    };
  }

  private async persistBroadsheet(
    armId: string,
    termId: string,
    rows: StudentBroadsheetRow[],
  ): Promise<void> {
    await Promise.all(
      rows.map((row) =>
        this.prisma.studentTermResult.upsert({
          where: { studentId_termId: { studentId: row.studentId, termId } },
          update: {
            armId,
            overallAverage: row.overallAverage,
            overallPosition: row.overallPosition,
            classSize: row.classSize,
          },
          create: {
            studentId: row.studentId,
            termId,
            armId,
            overallAverage: row.overallAverage,
            overallPosition: row.overallPosition,
            classSize: row.classSize,
          },
        }),
      ),
    );
  }

  private async getSubjectLockStatus(
    classId: string,
    termId: string,
  ): Promise<{ subjects: SubjectLockStatus[]; allLocked: boolean }> {
    const classSubjects = await this.prisma.classSubject.findMany({
      where: { classId },
      include: { subject: true },
    });
    const submissions = await this.prisma.scoreSubmission.findMany({
      where: { termId, classSubjectId: { in: classSubjects.map((c) => c.id) } },
    });
    const submissionByClassSubject = new Map(
      submissions.map((s) => [s.classSubjectId, s]),
    );
    const subjects = classSubjects.map((cs) => ({
      classSubjectId: cs.id,
      subjectName: cs.subject.name,
      locked: submissionByClassSubject.get(cs.id)?.locked ?? false,
    }));
    const allLocked = subjects.length > 0 && subjects.every((s) => s.locked);
    return { subjects, allLocked };
  }

  private async getOrCreateStatus(
    armId: string,
    termId: string,
  ): Promise<ClassTermResultStatus> {
    // upsert (not find-then-create) — two concurrent first-ever requests
    // for the same arm+term (e.g. two staff opening the status page at
    // once) would otherwise both pass the find with null and race to
    // create, and the loser would crash on the @@unique([armId, termId])
    // violation instead of just getting the winner's row back.
    return this.prisma.classTermResultStatus.upsert({
      where: { armId_termId: { armId, termId } },
      update: {},
      create: { armId, termId },
    });
  }

  private async getStatusOrThrow(
    armId: string,
    termId: string,
  ): Promise<ClassTermResultStatus> {
    const status = await this.prisma.classTermResultStatus.findUnique({
      where: { armId_termId: { armId, termId } },
    });
    if (!status) {
      throw new NotFoundException(
        'No result workflow has started for this class/term yet',
      );
    }
    return status;
  }

  // Once a result is APPROVED or PUBLISHED, conduct ratings/comments stop
  // being casually editable — without this, a Class Teacher or Admin
  // could silently change what a student/parent already saw published,
  // with no audit trail and no way for the already-generated PDF to ever
  // catch up. Reopen via returnResult (RETURNABLE_STAGES above) first.
  private async assertEditableStage(
    armId: string,
    termId: string,
  ): Promise<void> {
    const status = await this.prisma.classTermResultStatus.findUnique({
      where: { armId_termId: { armId, termId } },
    });
    if (
      status &&
      (status.stage === 'APPROVED' || status.stage === 'PUBLISHED')
    ) {
      throw new BadRequestException(
        `This result is already ${status.stage.toLowerCase()} — an Admin must return it for correction before ratings or comments can be changed.`,
      );
    }
  }

  private async assertActivelyEnrolled(
    studentId: string,
    armId: string,
    termId: string,
  ): Promise<void> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, armId, termId, status: 'ACTIVE' },
    });
    if (!enrollment) {
      throw new BadRequestException(
        'Student is not actively enrolled in this arm this term',
      );
    }
  }

  private async getArmOrThrow(armId: string): Promise<Arm> {
    const arm = await this.prisma.arm.findUnique({ where: { id: armId } });
    if (!arm) throw new NotFoundException('Arm not found');
    return arm;
  }
}
