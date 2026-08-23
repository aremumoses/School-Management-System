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
import type { Response } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { BulkImportCommitDto } from './bulk-import-commit.dto';
import { LibraryBulkImportService } from './bulk-import.service';

const MANAGE_ROLES = ['LIBRARIAN', 'ADMIN'] as const;

@ApiTags('library')
@Controller('library/books/bulk-import')
export class LibraryBulkImportController {
  constructor(private readonly bulkImportService: LibraryBulkImportService) {}

  @Roles(...MANAGE_ROLES)
  @Get('template')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="library-catalog-template.xlsx"',
  )
  @ApiOperation({
    summary:
      'Download a ready-to-fill .xlsx template with the expected columns',
  })
  async downloadTemplate(@Res() res: Response): Promise<void> {
    const buffer = await this.bulkImportService.buildTemplate();
    res.send(buffer);
  }

  @Roles(...MANAGE_ROLES)
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
      'Parse and validate a catalog-import spreadsheet without writing anything — returns valid and invalid rows for review',
  })
  preview(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.bulkImportService.preview(file.buffer);
  }

  @Roles(...MANAGE_ROLES)
  @Post('commit')
  @ApiOperation({
    summary:
      "Write the rows from a preview's `valid` array as real Book records",
  })
  commit(@Body() dto: BulkImportCommitDto) {
    return this.bulkImportService.commit(dto);
  }
}
