import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import {
  createSheet,
  sendExcelResponse,
} from '../../common/excel/excel-export.util';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import {
  CreatePayrollRunDto,
  CreateSalaryStructureDto,
  UpdatePayrollConfigDto,
  UpdateSalaryStructureDto,
} from './dto/payroll.dto';
import { PayrollService } from './payroll.service';
import { PayrollSettingsService } from './payroll-settings.service';
import { TaxCalculationService } from './tax-calculation.service';

@ApiTags('hr-payroll')
@Controller('hr/payroll')
export class PayrollController {
  constructor(
    private readonly payroll: PayrollService,
    private readonly settings: PayrollSettingsService,
    private readonly taxCalculation: TaxCalculationService,
  ) {}

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('config')
  getConfig() {
    return this.taxCalculation.loadConfig();
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Post('config')
  updateConfig(@Body() dto: UpdatePayrollConfigDto) {
    return this.taxCalculation.updateConfig(dto);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('salary-structures')
  listSalaryStructures() {
    return this.settings.listSalaryStructures();
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Post('salary-structures')
  createSalaryStructure(@Body() dto: CreateSalaryStructureDto) {
    return this.settings.createSalaryStructure(dto);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Patch('salary-structures/:id')
  updateSalaryStructure(
    @Param('id') id: string,
    @Body() dto: UpdateSalaryStructureDto,
  ) {
    return this.settings.updateSalaryStructure(id, dto);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Post('runs')
  createRun(
    @Body() dto: CreatePayrollRunDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.payroll.createRun(dto, user);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('runs')
  listRuns() {
    return this.payroll.listRuns();
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('runs/:id')
  getRun(@Param('id') id: string) {
    return this.payroll.getRun(id);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Patch('runs/:id/review')
  markReviewed(@Param('id') id: string) {
    return this.payroll.markReviewed(id);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Patch('runs/:id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.payroll.approve(id, user);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('payslips')
  listPayslips(
    @Query('staffId') staffId?: string,
    @Query('payrollRunId') payrollRunId?: string,
  ) {
    return this.payroll.listPayslips(staffId, payrollRunId);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('runs/:id/bank-schedule/export')
  @ApiProduces('text/csv')
  @ApiOperation({
    summary: 'Bank payment schedule for an approved run, as CSV',
  })
  async exportBankSchedule(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.payroll.getBankSchedule(id);
    const header = 'Staff Name,Bank Name,Account Number,Account Name,Net Pay\n';
    const body = rows
      .map(
        (r) =>
          `"${r.staffName}","${r.bankName}","${r.bankAccountNumber}","${r.bankAccountName}",${r.netPay}`,
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="bank-schedule-${id}.csv"`,
    );
    res.send(header + body);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('runs/:id/payslips/export')
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'All payslips in a run as an Excel workbook' })
  async exportPayslips(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const run = await this.payroll.getRun(id);
    const wb = new ExcelJS.Workbook();
    const sheet = createSheet(wb, 'Payslips', [
      'Staff Name',
      'Gross Pay',
      'PAYE',
      'Pension',
      'Other Deductions',
      'Net Pay',
      'PDF URL',
    ]);
    for (const p of run.payslips) {
      sheet.addRow([
        `${p.staff.firstName} ${p.staff.lastName}`,
        p.grossPay,
        p.payeDeduction,
        p.pensionDeduction,
        p.otherDeductions,
        p.netPay,
        p.pdfUrl ?? '',
      ]);
    }
    await sendExcelResponse(res, wb, `payslips-${run.month}-${run.year}.xlsx`);
  }
}
