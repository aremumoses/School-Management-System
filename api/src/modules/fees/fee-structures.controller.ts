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
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import {
  AddFeeComponentDto,
  CreateFeeStructureDto,
  QueryFeeStructuresDto,
  UpdateFeeComponentDto,
} from './dto/fee-structure.dto';
import { FeeStructuresService } from './fee-structures.service';

@ApiTags('fee-structures')
@Controller('fee-structures')
export class FeeStructuresController {
  constructor(private readonly feeStructuresService: FeeStructuresService) {}

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR')
  @Post()
  @ApiOperation({
    summary: 'Define a fee structure (and its components) for a class+term',
  })
  create(@Body() dto: CreateFeeStructureDto, @CurrentUser() user: RequestUser) {
    return this.feeStructuresService.create(dto, user);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR')
  @Get()
  @ApiOperation({
    summary: 'List fee structures, optionally filtered by class/term',
  })
  list(@Query() query: QueryFeeStructuresDto) {
    return this.feeStructuresService.list(query);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR')
  @Get(':id')
  @ApiOperation({ summary: 'A single fee structure with its components' })
  getOne(@Param('id') id: string) {
    return this.feeStructuresService.getOrThrow(id);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR')
  @Post(':id/components')
  @ApiOperation({ summary: 'Add a fee component to an existing structure' })
  addComponent(
    @Param('id') id: string,
    @Body() dto: AddFeeComponentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.feeStructuresService.addComponent(id, dto, user);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR')
  @Patch('components/:componentId')
  @ApiOperation({ summary: "Edit a fee component's name, amount, or type" })
  updateComponent(
    @Param('componentId') componentId: string,
    @Body() dto: UpdateFeeComponentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.feeStructuresService.updateComponent(componentId, dto, user);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR')
  @Delete('components/:componentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a fee component from its structure' })
  async deleteComponent(
    @Param('componentId') componentId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.feeStructuresService.deleteComponent(componentId, user);
  }
}
