import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdatePayrollConfigDto } from './dto/payroll.dto';

export interface PayeBand {
  upTo: number | null;
  rate: number;
}

export interface PayrollConfig {
  payeBands: PayeBand[];
  craFlatAmount: number;
  craPercentOfGross: number;
  craPercentAllowance: number;
  pensionEmployeeRate: number;
}

export interface MonthlyPayComponents {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
}

export interface TaxCalculationResult {
  grossPay: number;
  payeDeduction: number;
  pensionDeduction: number;
  netPay: number;
}

/**
 * Nigerian PAYE (graduated bands over taxable income after Consolidated
 * Relief Allowance) + employee pension contribution — see the Personal
 * Income Tax Act's standard CRA formula (greater of a flat amount or a % of
 * gross, plus a flat % of gross always added) and the Pension Reform Act's
 * employee contribution rate. **Tax law changes** — these are sensible
 * out-of-the-box defaults, not a hardcoded snapshot the school should trust
 * blindly; confirm current rates with the school's accountant before
 * relying on this for real payroll, then update via
 * PATCH /hr/payroll/config.
 */
const DEFAULT_PAYROLL_CONFIG: PayrollConfig = {
  payeBands: [
    { upTo: 300_000, rate: 7 },
    { upTo: 600_000, rate: 11 },
    { upTo: 1_100_000, rate: 15 },
    { upTo: 1_600_000, rate: 19 },
    { upTo: 3_200_000, rate: 21 },
    { upTo: null, rate: 24 },
  ],
  craFlatAmount: 200_000,
  craPercentOfGross: 1,
  craPercentAllowance: 20,
  pensionEmployeeRate: 8,
};

@Injectable()
export class TaxCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  async loadConfig(): Promise<PayrollConfig> {
    const school = await this.prisma.school.findFirst();
    const stored = school?.payrollConfig as Partial<PayrollConfig> | null;
    return { ...DEFAULT_PAYROLL_CONFIG, ...stored };
  }

  async updateConfig(dto: UpdatePayrollConfigDto): Promise<PayrollConfig> {
    const school = await this.prisma.school.findFirst();
    const config: PayrollConfig = {
      payeBands: dto.payeBands,
      craFlatAmount: dto.craFlatAmount,
      craPercentOfGross: dto.craPercentOfGross,
      craPercentAllowance: dto.craPercentAllowance,
      pensionEmployeeRate: dto.pensionEmployeeRate,
    };
    if (school) {
      await this.prisma.school.update({
        where: { id: school.id },
        data: { payrollConfig: config as unknown as Prisma.InputJsonValue },
      });
    }
    return config;
  }

  /** Computes one month's gross/PAYE/pension/net for a single staff member's salary structure. */
  async calculateMonthly(
    components: MonthlyPayComponents,
  ): Promise<TaxCalculationResult> {
    const config = await this.loadConfig();
    const grossMonthly =
      components.basicSalary +
      components.housingAllowance +
      components.transportAllowance +
      components.otherAllowances;
    const grossAnnual = grossMonthly * 12;

    const pensionableAnnual =
      (components.basicSalary +
        components.housingAllowance +
        components.transportAllowance) *
      12;
    const pensionAnnual =
      pensionableAnnual * (config.pensionEmployeeRate / 100);

    const cra =
      Math.max(
        config.craFlatAmount,
        grossAnnual * (config.craPercentOfGross / 100),
      ) +
      grossAnnual * (config.craPercentAllowance / 100);

    const taxableAnnual = Math.max(0, grossAnnual - pensionAnnual - cra);
    const payeAnnual = this.applyBands(taxableAnnual, config.payeBands);

    return {
      grossPay: round2(grossMonthly),
      payeDeduction: round2(payeAnnual / 12),
      pensionDeduction: round2(pensionAnnual / 12),
      netPay: round2(grossMonthly - payeAnnual / 12 - pensionAnnual / 12),
    };
  }

  /** Cumulative graduated-band tax — each band's rate applies only to the slice of income within it. */
  private applyBands(taxableAnnual: number, bands: PayeBand[]): number {
    let remaining = taxableAnnual;
    let previousUpTo = 0;
    let tax = 0;

    for (const band of bands) {
      if (remaining <= 0) break;
      const bandWidth =
        band.upTo === null ? Infinity : band.upTo - previousUpTo;
      const taxableInBand = Math.min(remaining, bandWidth);
      tax += taxableInBand * (band.rate / 100);
      remaining -= taxableInBand;
      previousUpTo = band.upTo ?? previousUpTo;
    }

    return tax;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
