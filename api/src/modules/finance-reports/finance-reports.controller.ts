import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { QueryCollectionSummaryDto } from './dto/query-collection-summary.dto';
import {
  QueryExpensesSummaryDto,
  QueryTrendsDto,
} from './dto/query-trends.dto';
import { FinanceReportsService } from './finance-reports.service';

@ApiTags('finance-reports')
@Controller('reports/finance')
export class FinanceReportsController {
  constructor(private readonly financeReportsService: FinanceReportsService) {}

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR')
  @Get('collection-summary')
  @ApiOperation({
    summary: 'Expected vs collected for a term, by class and by fee component',
  })
  collectionSummary(@Query() query: QueryCollectionSummaryDto) {
    return this.financeReportsService.getCollectionSummary(query.termId);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR')
  @Get('outstanding')
  @ApiOperation({
    summary: 'The full outstanding-balance report, by class and by term',
  })
  outstanding() {
    return this.financeReportsService.getOutstandingReport();
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR')
  @Get('trends')
  @ApiOperation({
    summary:
      'Term-on-term (or session-on-session) collection trend — expected, collected, outstanding, and collection rate per bucket, chronological',
  })
  trends(@Query() query: QueryTrendsDto) {
    return this.financeReportsService.getTrends(
      query.metric ?? 'collection',
      query.granularity ?? 'term',
    );
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'BURSAR')
  @Get('expenses-summary')
  @ApiOperation({
    summary:
      'Total expenses by category and net income (collected − expenses) for a period',
  })
  expensesSummary(@Query() query: QueryExpensesSummaryDto) {
    return this.financeReportsService.getExpensesSummary(query.from, query.to);
  }
}
