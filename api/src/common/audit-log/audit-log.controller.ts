import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Roles } from '../decorators/roles.decorator';
import { AuditLogService } from './audit-log.service';

class AuditLogQueryDto {
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() actorId?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() pageSize?: string;
}

@ApiTags('audit-log')
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Roles('ADMIN')
  @Get()
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'ISO date — earliest entry to return',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'ISO date — latest entry to return',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Max 100 per page',
  })
  @ApiOperation({ summary: 'Paginated audit log — Admin only, read-only' })
  list(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.list({
      entityType: query.entityType,
      actorId: query.actorId,
      from: query.from,
      to: query.to,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  }
}
