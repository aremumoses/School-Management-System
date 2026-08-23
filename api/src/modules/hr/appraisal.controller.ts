import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { AppraisalService } from './appraisal.service';
import {
  CreateAppraisalCycleDto,
  CreateAppraisalSubmissionDto,
  SaveAppraisalResponsesDto,
  UpdateAppraisalCycleStatusDto,
  UpsertAppraisalFormDto,
} from './dto/appraisal.dto';

@ApiTags('hr-appraisals')
@Controller('hr')
export class AppraisalController {
  constructor(private readonly service: AppraisalService) {}

  @Roles('HR_OFFICER', 'ADMIN')
  @Post('appraisal-forms')
  upsertForm(
    @Body() dto: UpsertAppraisalFormDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.upsertForm(dto, user);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('appraisal-forms')
  listForms() {
    return this.service.listForms();
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Post('appraisal-cycles')
  createCycle(
    @Body() dto: CreateAppraisalCycleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createCycle(dto, user);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('appraisal-cycles')
  listCycles() {
    return this.service.listCycles();
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('appraisal-cycles/:id')
  getCycle(@Param('id') id: string) {
    return this.service.getCycle(id);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Patch('appraisal-cycles/:id/status')
  updateCycleStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppraisalCycleStatusDto,
  ) {
    return this.service.updateCycleStatus(id, dto);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Post('appraisal-cycles/:id/submissions')
  createSubmission(
    @Param('id') id: string,
    @Body() dto: CreateAppraisalSubmissionDto,
  ) {
    return this.service.createSubmission(id, dto);
  }

  @Roles()
  @Get('appraisal-submissions/mine')
  mySubmissions(@CurrentUser() user: RequestUser) {
    return this.service.listMySubmissions(user.id);
  }

  @Roles()
  @Get('appraisal-submissions/:id')
  getSubmission(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.getSubmission(id, user);
  }

  @Roles()
  @Patch('appraisal-submissions/:id')
  saveResponses(
    @Param('id') id: string,
    @Body() dto: SaveAppraisalResponsesDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.saveResponses(id, dto, user);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Patch('appraisal-submissions/:id/sign-off')
  signOff(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.signOff(id, user);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('staff/:id/appraisal-history')
  getStaffHistory(@Param('id') id: string) {
    return this.service.getStaffHistory(id);
  }
}
