import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import {
  AddDiscountDto,
  CreateIndividualInvoiceDto,
  GenerateInvoicesDto,
  QueryDefaultersDto,
  QueryInvoicesDto,
} from './dto/invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // Static segments ('generate', 'defaulters') must be declared before the
  // dynamic ':studentId'/':id' routes below — Nest matches in declaration
  // order, so a dynamic route declared first would swallow these.

  @Roles('BURSAR')
  @Post('generate')
  @ApiOperation({
    summary: 'Bulk-generate invoices for a class+term from its fee structure',
  })
  generate(@Body() dto: GenerateInvoicesDto, @CurrentUser() user: RequestUser) {
    return this.invoicesService.generateForClass(dto, user);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR')
  @Get('defaulters')
  @ApiOperation({
    summary: 'Students with an outstanding balance, filterable/sortable',
  })
  defaulters(@Query() query: QueryDefaultersDto) {
    return this.invoicesService.getDefaulters(query);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR', 'STUDENT', 'PARENT')
  @Get()
  @ApiOperation({
    summary: 'List invoices — Student/Parent see only their own/ward’s',
  })
  list(@Query() query: QueryInvoicesDto, @CurrentUser() user: RequestUser) {
    return this.invoicesService.list(query, user);
  }

  @Roles('BURSAR')
  @Post(':studentId')
  @ApiOperation({
    summary:
      'Create a standalone, ad-hoc invoice for one student (e.g. a mid-term levy)',
  })
  createIndividual(
    @Param('studentId') studentId: string,
    @Body() dto: CreateIndividualInvoiceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.invoicesService.createIndividual(studentId, dto, user);
  }

  @Roles('BURSAR')
  @Post(':id/discounts')
  @ApiOperation({
    summary: 'Apply a percentage or flat discount to an invoice, with a reason',
  })
  addDiscount(
    @Param('id') id: string,
    @Body() dto: AddDiscountDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.invoicesService.addDiscount(id, dto, user);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR', 'STUDENT', 'PARENT')
  @Get(':id')
  @ApiOperation({
    summary: 'A single invoice with its line items, discounts, and payments',
  })
  getOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.invoicesService.getOrThrow(id, user);
  }
}
