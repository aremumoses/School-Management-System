import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { CommunicationModule } from '../communication/communication.module';
import { StaffModule } from '../staff/staff.module';
import { AppraisalController } from './appraisal.controller';
import { AppraisalService } from './appraisal.service';
import { DocumentExpiryAlertService } from './document-expiry-alert.service';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { OffboardingController } from './offboarding.controller';
import { OffboardingService } from './offboarding.service';
import { PAYSLIPS_QUEUE } from './payroll/payslip.constants';
import { PayslipProcessor } from './payroll/payslip.processor';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollSettingsService } from './payroll-settings.service';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { StaffAttendanceController } from './staff-attendance.controller';
import { StaffAttendanceService } from './staff-attendance.service';
import { StaffDisciplinaryController } from './staff-disciplinary.controller';
import { StaffDisciplinaryService } from './staff-disciplinary.service';
import { StaffEmploymentController } from './staff-employment.controller';
import { StaffEmploymentService } from './staff-employment.service';
import { TaxCalculationService } from './tax-calculation.service';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
  imports: [
    // Recruitment's public /hr/vacancies/:id/apply needs rate limiting but
    // has no JWT guard to fall back on — same reasoning/skipIf as
    // AdmissionsModule's identical setup.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 10,
        skipIf: () => process.env.NODE_ENV === 'test',
      },
    ]),
    BullModule.registerQueue({
      name: PAYSLIPS_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
      },
    }),
    CommunicationModule,
    StaffModule,
  ],
  controllers: [
    StaffEmploymentController,
    RecruitmentController,
    LeaveController,
    PayrollController,
    StaffAttendanceController,
    StaffDisciplinaryController,
    OffboardingController,
    AppraisalController,
    TrainingController,
  ],
  providers: [
    StaffEmploymentService,
    RecruitmentService,
    LeaveService,
    PayrollSettingsService,
    TaxCalculationService,
    PayrollService,
    PayslipProcessor,
    StaffAttendanceService,
    StaffDisciplinaryService,
    OffboardingService,
    DocumentExpiryAlertService,
    AppraisalService,
    TrainingService,
  ],
  exports: [LeaveService],
})
export class HrModule {}
