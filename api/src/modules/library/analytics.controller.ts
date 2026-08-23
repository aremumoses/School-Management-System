import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { LibraryAnalyticsService } from './analytics.service';

const MANAGE_ROLES = ['LIBRARIAN', 'ADMIN'] as const;

@ApiTags('library')
@Controller('library/analytics')
export class LibraryAnalyticsController {
  constructor(private readonly analyticsService: LibraryAnalyticsService) {}

  @Roles(...MANAGE_ROLES)
  @Get()
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({
    summary:
      'Most-borrowed titles, busiest periods, overdue rate, category-level usage',
  })
  get(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getAnalytics(from, to);
  }
}
