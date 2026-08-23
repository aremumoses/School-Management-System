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
import { ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import {
  createSheet,
  sendExcelResponse,
} from '../../common/excel/excel-export.util';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateBookDto,
  UpdateBookDto,
  UpdateLibraryPolicyDto,
} from './dto/library.dto';
import { LibraryService } from './library.service';
import { LibrarySettingsService } from './library-settings.service';

const MANAGE_ROLES = ['LIBRARIAN', 'ADMIN'] as const;

@ApiTags('library')
@Controller('library/books')
export class LibraryController {
  constructor(
    private readonly libraryService: LibraryService,
    private readonly settingsService: LibrarySettingsService,
  ) {}

  @Roles(...MANAGE_ROLES)
  @Post()
  @ApiOperation({ summary: 'Add a book to the catalog' })
  create(@Body() dto: CreateBookDto) {
    return this.libraryService.create(dto);
  }

  @Roles()
  @Get()
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiOperation({
    summary:
      'Browse/search the catalog — open to any authenticated role, students/staff browse too',
  })
  list(@Query('search') search?: string, @Query('category') category?: string) {
    return this.libraryService.list(search, category);
  }

  @Roles(...MANAGE_ROLES)
  @Get('export')
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({
    summary: 'Export the full catalog inventory as an Excel file',
  })
  async export(@Res() res: Response): Promise<void> {
    const books = await this.libraryService.list();
    const wb = new ExcelJS.Workbook();
    const sheet = createSheet(wb, 'Catalog', [
      'Title',
      'Author',
      'ISBN',
      'Category',
      'Total Copies',
      'Available Copies',
      'Shelf Location',
    ]);
    for (const book of books) {
      sheet.addRow([
        book.title,
        book.author,
        book.isbn ?? '',
        book.category,
        book.totalCopies,
        book.availableCopies,
        book.shelfLocation ?? '',
      ]);
    }
    await sendExcelResponse(res, wb, `library-catalog-${Date.now()}.xlsx`);
  }

  @Roles()
  @Get(':id')
  @ApiOperation({ summary: 'One book' })
  getOne(@Param('id') id: string) {
    return this.libraryService.getOne(id);
  }

  @Roles(...MANAGE_ROLES)
  @Patch(':id')
  @ApiOperation({ summary: 'Edit a book' })
  update(@Param('id') id: string, @Body() dto: UpdateBookDto) {
    return this.libraryService.update(id, dto);
  }
}

@ApiTags('library')
@Controller('library/settings')
export class LibrarySettingsController {
  constructor(private readonly settingsService: LibrarySettingsService) {}

  @Roles(...MANAGE_ROLES)
  @Get()
  @ApiOperation({
    summary:
      'The school-configurable loan policy — loan periods, borrowing limits, fine-per-day',
  })
  get() {
    return this.settingsService.loadPolicy();
  }

  @Roles(...MANAGE_ROLES)
  @Patch()
  @ApiOperation({ summary: 'Update the loan policy' })
  update(@Body() dto: UpdateLibraryPolicyDto) {
    return this.settingsService.updatePolicy(dto);
  }
}
