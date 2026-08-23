import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { BulkImportCommitDto } from '../dto/bulk-import-commit.dto';
import { BulkImportService } from './bulk-import.service';

@ApiTags('students')
@Controller('students/bulk-import')
export class BulkImportController {
  constructor(private readonly bulkImportService: BulkImportService) {}

  @Roles('ADMIN')
  @Get('template')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="student-import-template.xlsx"',
  )
  @ApiOperation({
    summary:
      'Download a ready-to-fill .xlsx template with the expected columns',
  })
  async downloadTemplate(@Res() res: Response): Promise<void> {
    const buffer = await this.bulkImportService.buildTemplate();
    res.send(buffer);
  }

  @Roles('ADMIN')
  @Post('preview')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        termId: { type: 'string' },
      },
    },
  })
  @ApiOperation({
    summary:
      'Parse and validate a student-import spreadsheet without writing anything — returns valid and invalid rows for review',
  })
  preview(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('termId') termId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!termId) {
      throw new BadRequestException('termId query parameter is required');
    }
    return this.bulkImportService.preview(file.buffer, termId);
  }

  @Roles('ADMIN')
  @Post('commit')
  @ApiOperation({
    summary:
      "Write the rows from a preview's `valid` array as real Student+Guardian+Enrollment records",
  })
  commit(@Body() dto: BulkImportCommitDto) {
    return this.bulkImportService.commit(dto);
  }
}
