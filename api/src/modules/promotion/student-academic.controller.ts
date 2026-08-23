import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { PromoteStudentDto } from './dto/promote-student.dto';
import { PromotionService } from './promotion.service';
import { TranscriptService } from './transcript.service';

@ApiTags('students')
@Controller('students')
export class StudentAcademicController {
  constructor(
    private readonly promotionService: PromotionService,
    private readonly transcriptService: TranscriptService,
  ) {}

  @Roles('ADMIN')
  @Post(':id/promote')
  @ApiOperation({
    summary:
      'Explicitly confirm a promotion outcome for a student (never auto-applied)',
  })
  promote(
    @Param('id') studentId: string,
    @Body() dto: PromoteStudentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.promotionService.promote(studentId, dto, user);
  }

  @Roles()
  @Get(':id/transcript')
  @ApiOperation({
    summary: "A student's full academic history across every session",
  })
  getTranscript(
    @Param('id') studentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.transcriptService.getTranscript(studentId, user);
  }
}
