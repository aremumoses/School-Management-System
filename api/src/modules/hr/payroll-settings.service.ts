import { Injectable, NotFoundException } from '@nestjs/common';
import type { SalaryStructure } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { translatePrismaError } from '../../common/utils/prisma-error';
import {
  CreateSalaryStructureDto,
  UpdateSalaryStructureDto,
} from './dto/payroll.dto';

@Injectable()
export class PayrollSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  listSalaryStructures(): Promise<SalaryStructure[]> {
    return this.prisma.salaryStructure.findMany({
      orderBy: { gradeLevel: 'asc' },
    });
  }

  async createSalaryStructure(
    dto: CreateSalaryStructureDto,
  ): Promise<SalaryStructure> {
    try {
      return await this.prisma.salaryStructure.create({
        data: {
          gradeLevel: dto.gradeLevel,
          basicSalary: dto.basicSalary,
          housingAllowance: dto.housingAllowance ?? 0,
          transportAllowance: dto.transportAllowance ?? 0,
          otherAllowances: dto.otherAllowances ?? 0,
        },
      });
    } catch (error) {
      translatePrismaError(
        error,
        'A salary structure for this grade level already exists',
      );
    }
  }

  async updateSalaryStructure(
    id: string,
    dto: UpdateSalaryStructureDto,
  ): Promise<SalaryStructure> {
    const structure = await this.prisma.salaryStructure.findUnique({
      where: { id },
    });
    if (!structure) throw new NotFoundException('Salary structure not found');
    return this.prisma.salaryStructure.update({ where: { id }, data: dto });
  }
}
