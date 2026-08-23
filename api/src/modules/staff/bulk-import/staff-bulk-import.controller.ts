import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { Response } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { StaffImportRow } from './staff-bulk-import.service';
import { StaffBulkImportService } from './staff-bulk-import.service';

class CommitRowDto implements StaffImportRow {
  rowNumber!: number;
  firstName!: string;
  lastName!: string;
  email!: string;
  phone!: string;
  employmentDate!: string;
  roles!: string[];
}

class StaffBulkCommitDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitRowDto)
  valid!: CommitRowDto[];
}

@ApiTags('staff')
@Controller('staff/bulk-import')
export class StaffBulkImportController {
  constructor(private readonly service: StaffBulkImportService) {}

  @Roles('ADMIN', 'HR_OFFICER')
  @Get('template')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="staff-import-template.xlsx"',
  )
  @ApiOperation({ summary: 'Download the staff bulk-import Excel template' })
  async downloadTemplate(@Res() res: Response): Promise<void> {
    const buffer = await this.service.buildTemplate();
    res.send(buffer);
  }

  @Roles('ADMIN', 'HR_OFFICER')
  @Post('preview')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary:
      'Parse and validate a staff import spreadsheet without writing anything',
  })
  preview(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.service.preview(file.buffer);
  }

  @Roles('ADMIN', 'HR_OFFICER')
  @Post('commit')
  @ApiOperation({
    summary: "Create staff records from the preview's valid rows",
  })
  commit(@Body() dto: StaffBulkCommitDto) {
    return this.service.commit(dto.valid);
  }
}
