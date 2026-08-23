import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { LibraryOverdueService } from './overdue.service';

const MANAGE_ROLES = ['LIBRARIAN', 'ADMIN'] as const;

@ApiTags('library')
@Controller('library/overdue')
export class LibraryOverdueController {
  constructor(private readonly overdueService: LibraryOverdueService) {}

  @Roles(...MANAGE_ROLES)
  @Get()
  @ApiOperation({
    summary: 'Real-time list of loans past their due date, with accrued fine',
  })
  list() {
    return this.overdueService.getOverdue();
  }

  @Roles(...MANAGE_ROLES)
  @Get('export')
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({ summary: 'Export the overdue/fines report as an Excel file' })
  async export(@Res() res: Response): Promise<void> {
    await this.overdueService.exportOverdue(res);
  }
}
