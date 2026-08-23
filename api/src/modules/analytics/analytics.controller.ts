import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Get('performance-trends')
  @ApiQuery({ name: 'sessionId', required: true })
  @ApiOperation({
    summary:
      'Average score per term across a session — schoolwide and per class',
  })
  getPerformanceTrends(@Query('sessionId') sessionId: string) {
    return this.analyticsService.getPerformanceTrends(sessionId);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'EXAM_OFFICER')
  @Get('subject-performance')
  @ApiQuery({ name: 'termId', required: true })
  @ApiOperation({
    summary: 'Average score per subject for a term — spot weak subjects',
  })
  getSubjectPerformance(@Query('termId') termId: string) {
    return this.analyticsService.getSubjectPerformance(termId);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Get('teacher-performance')
  @ApiQuery({ name: 'termId', required: true })
  @ApiOperation({
    summary:
      'Average class score per teacher/subject — which classes are trending low',
  })
  getTeacherPerformance(@Query('termId') termId: string) {
    return this.analyticsService.getTeacherPerformance(termId);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Get('attendance-trends')
  @ApiQuery({ name: 'sessionId', required: true })
  @ApiOperation({
    summary: 'School-wide daily attendance rate per term across a session',
  })
  getAttendanceTrends(@Query('sessionId') sessionId: string) {
    return this.analyticsService.getAttendanceTrends(sessionId);
  }
}
