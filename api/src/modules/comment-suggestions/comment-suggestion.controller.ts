import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { CommentSuggestionService } from './comment-suggestion.service';
import { SuggestCommentDto } from './dto/suggest-comment.dto';

@ApiTags('results')
@Controller('results')
export class CommentSuggestionController {
  constructor(private readonly service: CommentSuggestionService) {}

  @Roles('CLASS_TEACHER', 'ADMIN')
  @UseGuards(ThrottlerGuard)
  // A Class Teacher batch-clicking through ~40 students is the expected
  // normal usage pattern, not abuse — generous enough for that, still
  // bounded against a runaway bug or rapid duplicate clicks racking up
  // real per-call LLM cost.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(':classArmId/:termId/students/:studentId/suggest-comment')
  @ApiOperation({
    summary:
      "AI-suggested draft for the form-teacher or principal's comment, grounded in the student's actual term data — returned only, never saved (see submitConduct/setPrincipalComment for the real save path)",
  })
  suggest(
    @Param('classArmId') armId: string,
    @Param('termId') termId: string,
    @Param('studentId') studentId: string,
    @Body() dto: SuggestCommentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.suggest(
      armId,
      termId,
      studentId,
      dto.commentType,
      user,
    );
  }
}
