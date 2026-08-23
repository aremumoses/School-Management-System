import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { StatisticsService } from './statistics.service';

const MANAGE_ROLES = ['EXAM_OFFICER', 'ADMIN'] as const;

@ApiTags('statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Roles(...MANAGE_ROLES)
  @Get('pass-rate')
  @ApiQuery({ name: 'termId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiOperation({
    summary:
      'Pass rate + average per class-subject, filterable by class and/or subject — feeds the pass-rate bar chart',
  })
  getPassRate(
    @Query('termId') termId?: string,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.statisticsService.getPassRate(termId, classId, subjectId);
  }

  @Roles(...MANAGE_ROLES)
  @Get('subject-comparison')
  @ApiQuery({ name: 'termId', required: false })
  @ApiOperation({
    summary:
      'Average score + pass rate per subject, aggregated across every class/arm — for spotting a schoolwide weak subject',
  })
  getSubjectComparison(@Query('termId') termId?: string) {
    return this.statisticsService.getSubjectComparison(termId);
  }
}
