import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import {
  CreateExpenseDto,
  QueryExpensesDto,
  UpdateExpenseDto,
} from './dto/expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('expenses')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Roles('BURSAR', 'ADMIN')
  @Post()
  @ApiOperation({ summary: 'Record a non-fee expense (docs §7)' })
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: RequestUser) {
    return this.expensesService.create(dto, user);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR')
  @Get()
  @ApiOperation({
    summary: 'List expenses, filterable by category and date range',
  })
  list(@Query() query: QueryExpensesDto) {
    return this.expensesService.list(query);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR')
  @Get(':id')
  @ApiOperation({ summary: 'Get one expense' })
  getOne(@Param('id') id: string) {
    return this.expensesService.getOrThrow(id);
  }

  @Roles('BURSAR', 'ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Correct an expense entry (audit-logged)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.expensesService.update(id, dto, user);
  }

  @Roles('BURSAR', 'ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Void an expense (soft — the row is kept and excluded from lists/reports, per the "financial records are never hard-deleted" convention)',
  })
  async void(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.expensesService.void(id, user);
  }

  @Roles('BURSAR', 'ADMIN')
  @Post(':id/receipt')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Attach a receipt/attachment to an expense' })
  uploadReceipt(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.expensesService.uploadReceipt(id, file, user);
  }
}
