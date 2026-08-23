import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { QueryScoresDto } from './dto/query-scores.dto';
import { SubmitScoresDto } from './dto/submit-scores.dto';
import { UnlockScoresDto } from './dto/unlock-scores.dto';
import { ScoresService } from './scores.service';

@ApiTags('scores')
@Controller('scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Roles('SUBJECT_TEACHER')
  @Post('submit')
  @ApiOperation({
    summary:
      'Submit (and lock) CA/exam scores for a class/subject/term — can be called repeatedly with a partial entry set while unlocked',
  })
  submit(@Body() dto: SubmitScoresDto, @CurrentUser() user: RequestUser) {
    return this.scoresService.submit(dto, user);
  }

  @Roles('ADMIN', 'EXAM_OFFICER')
  @Post('unlock')
  @ApiOperation({
    summary: 'Reopen a locked score submission for corrections (audit-logged)',
  })
  unlock(@Body() dto: UnlockScoresDto, @CurrentUser() user: RequestUser) {
    return this.scoresService.unlock(dto, user);
  }

  @Roles(
    'ADMIN',
    'EXAM_OFFICER',
    'VICE_PRINCIPAL',
    'HOD',
    'SUBJECT_TEACHER',
    'CLASS_TEACHER',
  )
  @Get()
  @ApiOperation({
    summary: 'The score grid for a class/subject/term, with live total/grade',
  })
  getScores(@Query() query: QueryScoresDto, @CurrentUser() user: RequestUser) {
    return this.scoresService.getScores(query, user);
  }
}
