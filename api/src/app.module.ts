import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditLogModule } from './common/audit-log/audit-log.module';
import type { EnvConfig } from './common/config/env.validation';
import { PrismaModule } from './common/prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { HealthModule } from './health/health.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AcademicModule } from './modules/academic/academic.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AdmissionsModule } from './modules/admissions/admissions.module';
import { AuthModule } from './modules/auth/auth.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { DisciplineModule } from './modules/discipline/discipline.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { FeesModule } from './modules/fees/fees.module';
import { FinanceReportsModule } from './modules/finance-reports/finance-reports.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { ResultsModule } from './modules/results/results.module';
import { SchoolModule } from './modules/school/school.module';
import { ScoresModule } from './modules/scores/scores.module';
import { StaffModule } from './modules/staff/staff.module';
import { ClubsModule } from './modules/clubs/clubs.module';
import { ConsentFormsModule } from './modules/consent-forms/consent-forms.module';
import { CBTModule } from './modules/cbt/cbt.module';
import { FrontDeskModule } from './modules/front-desk/front-desk.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { StudentsModule } from './modules/students/students.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { LessonNotesModule } from './modules/lesson-notes/lesson-notes.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { ExamLogisticsModule } from './modules/exam-logistics/exam-logistics.module';
import { LibraryModule } from './modules/library/library.module';
import { HostelTransportModule } from './modules/hostel-transport/hostel-transport.module';
import { HrModule } from './modules/hr/hr.module';
import { AtRiskModule } from './modules/at-risk/at-risk.module';
import { CommentSuggestionModule } from './modules/comment-suggestions/comment-suggestion.module';
import { validateEnv } from './common/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // Internal pub/sub for cross-module side effects (e.g. attendance ->
    // notifications) without a hard service-to-service dependency — stays
    // in-process (not BullMQ) since these are fire-and-forget event
    // handlers, not work that needs to survive a process restart or run
    // out-of-request like report-card generation does (see BullModule
    // below for that).
    EventEmitterModule.forRoot(),
    // Stage 7's escalating fee-reminder job (docs/16-module-communication.md
    // §5) runs as an in-process `@Cron` task via this, not a BullMQ queue —
    // it's a single daily sweep over Invoice rows, not per-item work that
    // needs Redis-backed retry/distribution the way report-card/receipt
    // PDF generation does (see BullModule below for those).
    ScheduleModule.forRoot(),
    // Local Redis in dev, Upstash in production — docs/18-technical-architecture.md
    // §5. Report-card PDF generation (Stage 5) was the first queue; receipt
    // generation (Stage 6) is the second.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) => ({
        connection: {
          host: configService.get('REDIS_HOST', { infer: true }),
          port: configService.get('REDIS_PORT', { infer: true }),
        },
      }),
    }),
    PrismaModule,
    AuditLogModule,
    StorageModule,
    AuthModule,
    SchoolModule,
    AcademicModule,
    StaffModule,
    ClubsModule,
    ConsentFormsModule,
    CBTModule,
    FrontDeskModule,
    ResourcesModule,
    StudentsModule,
    AssignmentsModule,
    LessonNotesModule,
    TimetableModule,
    ExamLogisticsModule,
    LibraryModule,
    HostelTransportModule,
    HrModule,
    AtRiskModule,
    AttendanceModule,
    AssessmentModule,
    ScoresModule,
    ResultsModule,
    CommentSuggestionModule,
    PromotionModule,
    ExpensesModule,
    FeesModule,
    PaymentsModule,
    FinanceReportsModule,
    CommunicationModule,
    AdmissionsModule,
    AdminModule,
    AnalyticsModule,
    DisciplineModule,
    CalendarModule,
    DocumentsModule,
    HealthModule,
  ],
})
export class AppModule {}
