import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AssignInvigilatorDto } from './dto/exam-logistics.dto';
import { InvigilationService } from './invigilation.service';

const MANAGE_ROLES = ['EXAM_OFFICER', 'ADMIN'] as const;

@ApiTags('invigilation')
@Controller('exam-sessions/:id/invigilators')
export class InvigilationDutyController {
  constructor(private readonly invigilationService: InvigilationService) {}

  @Roles(...MANAGE_ROLES)
  @Get()
  @ApiOperation({ summary: 'Invigilators assigned to this exam session' })
  list(@Param('id') examSessionId: string) {
    return this.invigilationService.listForSession(examSessionId);
  }

  @Roles(...MANAGE_ROLES)
  @Post()
  @ApiOperation({
    summary:
      'Assign (or change the role of) an invigilator for this session — notifies the staff member',
  })
  assign(
    @Param('id') examSessionId: string,
    @Body() dto: AssignInvigilatorDto,
  ) {
    return this.invigilationService.assign(examSessionId, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Delete(':staffId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an invigilator from this session' })
  async remove(
    @Param('id') examSessionId: string,
    @Param('staffId') staffId: string,
  ): Promise<void> {
    await this.invigilationService.remove(examSessionId, staffId);
  }
}

@ApiTags('invigilation')
@Controller('invigilation')
export class InvigilationRosterController {
  constructor(private readonly invigilationService: InvigilationService) {}

  @Roles(...MANAGE_ROLES)
  @Get('roster')
  @ApiQuery({ name: 'termId', required: true })
  @ApiOperation({
    summary:
      "Every exam session in the term with its invigilators, so the picker can show each staff member's existing duty load",
  })
  roster(@Query('termId') termId: string) {
    return this.invigilationService.roster(termId);
  }
}
