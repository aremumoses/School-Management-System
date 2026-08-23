import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { CreateMalpracticeIncidentDto } from './dto/exam-logistics.dto';
import { MalpracticeService } from './malpractice.service';

const MANAGE_ROLES = ['EXAM_OFFICER', 'ADMIN'] as const;

@ApiTags('malpractice')
@Controller('malpractice-incidents')
export class MalpracticeController {
  constructor(private readonly malpracticeService: MalpracticeService) {}

  @Roles(...MANAGE_ROLES)
  @Post()
  @ApiOperation({
    summary:
      "Log an exam malpractice incident — separate from Stage 9's general discipline Incident model, cross-referenceable via relatedDisciplineIncidentId",
  })
  create(
    @Body() dto: CreateMalpracticeIncidentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.malpracticeService.create(dto, user);
  }

  @Roles(...MANAGE_ROLES)
  @Get()
  @ApiOperation({ summary: 'The malpractice log' })
  list() {
    return this.malpracticeService.list();
  }
}
