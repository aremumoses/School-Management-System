import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { PayrollRun, Payslip } from '@prisma/client';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { BroadcastsService } from '../communication/broadcasts.service';
import { CreatePayrollRunDto } from './dto/payroll.dto';
import { PAYSLIPS_QUEUE, PayslipJobData } from './payroll/payslip.constants';
import type { PayslipData } from './payroll/payslip.template';
import { TaxCalculationService } from './tax-calculation.service';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const RUN_INCLUDE = {
  payslips: {
    include: {
      staff: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  },
} as const;

export interface BankScheduleRow {
  staffName: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  netPay: number;
}

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taxCalculation: TaxCalculationService,
    private readonly broadcasts: BroadcastsService,
    @InjectQueue(PAYSLIPS_QUEUE)
    private readonly payslipsQueue: Queue<PayslipJobData>,
  ) {}

  async createRun(dto: CreatePayrollRunDto, user: RequestUser) {
    const existing = await this.prisma.payrollRun.findUnique({
      where: { month_year: { month: dto.month, year: dto.year } },
    });
    if (existing) {
      throw new ConflictException(
        'A payroll run for this month already exists',
      );
    }

    const employmentRecords = await this.prisma.staffEmploymentRecord.findMany({
      where: { salaryStructureId: { not: null }, staff: { isActive: true } },
      include: { staff: true, salaryStructure: true },
    });
    if (employmentRecords.length === 0) {
      throw new BadRequestException(
        "No active staff have a salary structure assigned yet — assign one on each staff member's employment record first.",
      );
    }

    const run = await this.prisma.payrollRun.create({
      data: { month: dto.month, year: dto.year, runByStaffId: user.id },
    });

    for (const record of employmentRecords) {
      const structure = record.salaryStructure!;
      const calc = await this.taxCalculation.calculateMonthly({
        basicSalary: structure.basicSalary,
        housingAllowance: structure.housingAllowance,
        transportAllowance: structure.transportAllowance,
        otherAllowances: structure.otherAllowances,
      });
      await this.prisma.payslip.create({
        data: {
          payrollRunId: run.id,
          staffId: record.staffId,
          grossPay: calc.grossPay,
          payeDeduction: calc.payeDeduction,
          pensionDeduction: calc.pensionDeduction,
          netPay: calc.netPay,
        },
      });
    }

    this.broadcasts
      .sendPayrollReviewReadyAlert({
        month: MONTH_NAMES[dto.month - 1],
        year: dto.year,
        staffCount: employmentRecords.length,
        targetId: run.id,
      })
      .catch((error: unknown) =>
        this.logger.error(
          'PAYROLL_REVIEW_READY notice failed',
          error instanceof Error ? error.stack : String(error),
        ),
      );

    return this.getRun(run.id);
  }

  listRuns(): Promise<(PayrollRun & { _count: { payslips: number } })[]> {
    return this.prisma.payrollRun.findMany({
      include: { _count: { select: { payslips: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async getRun(id: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: RUN_INCLUDE,
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    return run;
  }

  async markReviewed(id: string): Promise<PayrollRun> {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'DRAFT') {
      throw new ConflictException('Only a DRAFT run can be marked reviewed');
    }
    return this.prisma.payrollRun.update({
      where: { id },
      data: { status: 'REVIEWED' },
    });
  }

  /** Generates every payslip's PDF asynchronously — never let dozens of Puppeteer renders block this request. */
  async approve(id: string, user: RequestUser): Promise<PayrollRun> {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: { payslips: true },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'REVIEWED') {
      throw new ConflictException(
        'Mark this run as reviewed before approving it',
      );
    }

    const updated = await this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedByStaffId: user.id,
        approvedAt: new Date(),
      },
    });

    for (const payslip of run.payslips) {
      await this.payslipsQueue.add('generate', { payslipId: payslip.id });
    }

    return updated;
  }

  async buildPayslipData(payslipId: string): Promise<PayslipData> {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        payrollRun: true,
        staff: { include: { employmentRecord: true } },
      },
    });
    if (!payslip) throw new NotFoundException('Payslip not found');

    const school = await this.prisma.school.findFirst();

    return {
      school: {
        name: school?.name ?? 'School',
        logoUrl: school?.logoUrl ?? null,
        address: school?.address ?? null,
        motto: school?.motto ?? null,
        registrationNumber: school?.registrationNumber ?? null,
        primaryColor: school?.documentPrimaryColor ?? '#4F46E5',
        secondaryColor: school?.documentSecondaryColor ?? '#1E1B4B',
      },
      staff: {
        firstName: payslip.staff.firstName,
        lastName: payslip.staff.lastName,
        email: payslip.staff.email,
        department: payslip.staff.employmentRecord?.department ?? null,
      },
      monthLabel: MONTH_NAMES[payslip.payrollRun.month - 1],
      year: payslip.payrollRun.year,
      grossPay: payslip.grossPay,
      payeDeduction: payslip.payeDeduction,
      pensionDeduction: payslip.pensionDeduction,
      otherDeductions: payslip.otherDeductions,
      netPay: payslip.netPay,
      payslipNumber: payslip.id,
    };
  }

  listPayslips(staffId?: string, payrollRunId?: string): Promise<Payslip[]> {
    return this.prisma.payslip.findMany({
      where: {
        ...(staffId && { staffId }),
        ...(payrollRunId && { payrollRunId }),
      },
      include: {
        staff: { select: { firstName: true, lastName: true } },
        payrollRun: { select: { month: true, year: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBankSchedule(runId: string): Promise<BankScheduleRow[]> {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: {
        payslips: {
          include: { staff: { include: { employmentRecord: true } } },
        },
      },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'APPROVED') {
      throw new ConflictException(
        'Only an APPROVED run can export a bank schedule',
      );
    }

    await this.prisma.payrollRun.update({
      where: { id: runId },
      data: { bankScheduleExportedAt: new Date() },
    });

    return run.payslips.map((p) => ({
      staffName: `${p.staff.firstName} ${p.staff.lastName}`,
      bankName: p.staff.employmentRecord?.bankName ?? '',
      bankAccountNumber: p.staff.employmentRecord?.bankAccountNumber ?? '',
      bankAccountName: p.staff.employmentRecord?.bankAccountName ?? '',
      netPay: p.netPay,
    }));
  }
}
