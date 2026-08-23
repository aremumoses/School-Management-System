import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import {
  createSheet,
  sendExcelResponse,
} from '../../common/excel/excel-export.util';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UploadStaffDocumentDto,
  UpsertEmploymentRecordDto,
} from './dto/staff-employment.dto';
import { StaffEmploymentService } from './staff-employment.service';

@ApiTags('hr-staff')
@Controller('hr/staff')
export class StaffEmploymentController {
  constructor(private readonly service: StaffEmploymentService) {}

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('export')
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({
    summary:
      'Export the HR staff roster (with employment-record fields) as Excel',
  })
  async exportRoster(@Res() res: Response): Promise<void> {
    const staff = await this.service.listRosterForExport();

    const wb = new ExcelJS.Workbook();
    const sheet = createSheet(wb, 'Staff Roster', [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Department',
      'Roles',
      'Next of Kin',
      'Next of Kin Phone',
      'Bank Name',
      'Bank Account Number',
      'Active',
    ]);
    for (const s of staff) {
      sheet.addRow([
        s.firstName,
        s.lastName,
        s.email,
        s.phone ?? '',
        s.employmentRecord?.department ?? '',
        s.roles.map((r) => r.role).join(', '),
        s.employmentRecord?.nextOfKinName ?? '',
        s.employmentRecord?.nextOfKinPhone ?? '',
        s.employmentRecord?.bankName ?? '',
        s.employmentRecord?.bankAccountNumber ?? '',
        s.isActive ? 'Yes' : 'No',
      ]);
    }
    await sendExcelResponse(res, wb, 'staff-roster.xlsx');
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get(':id/employment-record')
  getEmploymentRecord(@Param('id') id: string) {
    return this.service.getEmploymentRecord(id);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Post(':id/employment-record')
  upsertEmploymentRecord(
    @Param('id') id: string,
    @Body() dto: UpsertEmploymentRecordDto,
  ) {
    return this.service.upsertEmploymentRecord(id, dto);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get(':id/documents')
  listDocuments(@Param('id') id: string) {
    return this.service.listDocuments(id);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', example: 'CV' },
        expiryDate: { type: 'string', example: '2027-01-01' },
      },
    },
  })
  @ApiOperation({ summary: "Upload a document to a staff member's HR file" })
  uploadDocument(
    @Param('id') id: string,
    @Body() dto: UploadStaffDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.uploadDocument(id, dto.type, dto.expiryDate, file);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Delete('documents/:documentId')
  deleteDocument(@Param('documentId') documentId: string) {
    return this.service.deleteDocument(documentId);
  }
}
