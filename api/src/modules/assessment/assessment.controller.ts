import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { AssessmentService } from './assessment.service';
import {
  CreateAssessmentComponentDto,
  QueryAssessmentComponentsDto,
  UpdateAssessmentComponentDto,
} from './dto/assessment-component.dto';

@ApiTags('assessment-components')
@Controller('assessment-components')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Roles()
  @Get()
  @ApiOperation({
    summary:
      'List assessment components for a term, or — if subjectId is given — the effective (resolved) set for that subject',
  })
  list(@Query() query: QueryAssessmentComponentsDto) {
    if (query.subjectId) {
      return this.assessmentService.getEffectiveComponents(
        query.termId,
        query.subjectId,
      );
    }
    return this.assessmentService.listForTerm(query.termId);
  }

  @Roles('ADMIN', 'EXAM_OFFICER')
  @Post()
  @ApiOperation({
    summary:
      'Create an assessment component (e.g. CA1) for a term, optionally scoped to one subject',
  })
  create(
    @Body() dto: CreateAssessmentComponentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assessmentService.create(dto, user);
  }

  @Roles('ADMIN', 'EXAM_OFFICER')
  @Patch(':id')
  @ApiOperation({ summary: 'Update an assessment component' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentComponentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assessmentService.update(id, dto, user);
  }

  @Roles('ADMIN', 'EXAM_OFFICER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an assessment component' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.assessmentService.delete(id, user);
  }
}
