import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateAtRiskConfigDto } from './dto/update-at-risk-config.dto';

export interface AtRiskThresholdConfig {
  attendanceRateFloor: number;
  caAverageFloor: number;
  notifyGuardianOnFlag: boolean;
}

// Sensible out-of-the-box behavior before Admin configures anything —
// same "never throw, fall back to a default" stance as
// LibrarySettingsService.DEFAULT_POLICY. 75/40 mirror the exact numbers
// Stage 4's chronic-absenteeism admin-dashboard default and Stage 18's
// gradebook default already used independently, before this config
// existed to unify them.
export const DEFAULT_AT_RISK_CONFIG: AtRiskThresholdConfig = {
  attendanceRateFloor: 75,
  caAverageFloor: 40,
  notifyGuardianOnFlag: false,
};

/**
 * The third place a configurable pass/fail-style threshold exists in this
 * codebase (after Stage 4's chronic-absenteeism query param and Stage 18's
 * gradebook at-risk query param) — this is the one persisted, genuinely
 * school-configurable version, and the other two now default to reading
 * from it (see AttendanceService.getChronicAbsenteeism and
 * GradebookService.getGradebook) instead of each hardcoding its own
 * separate number, while still allowing an explicit query-param override
 * for ad hoc admin exploration.
 */
@Injectable()
export class AtRiskSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async loadConfig(): Promise<AtRiskThresholdConfig> {
    const school = await this.prisma.school.findFirst();
    const stored =
      school?.atRiskConfig as Partial<AtRiskThresholdConfig> | null;
    return { ...DEFAULT_AT_RISK_CONFIG, ...stored };
  }

  async updateConfig(
    dto: UpdateAtRiskConfigDto,
  ): Promise<AtRiskThresholdConfig> {
    const school = await this.prisma.school.findFirst();
    const config: AtRiskThresholdConfig = {
      attendanceRateFloor: dto.attendanceRateFloor,
      caAverageFloor: dto.caAverageFloor,
      notifyGuardianOnFlag: dto.notifyGuardianOnFlag,
    };
    if (school) {
      await this.prisma.school.update({
        where: { id: school.id },
        data: { atRiskConfig: config as unknown as Prisma.InputJsonValue },
      });
    }
    return config;
  }
}
