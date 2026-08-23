import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import {
  ApplyToVacancyDto,
  ConvertCandidateDto,
  CreateVacancyDto,
  UpdateCandidateStageDto,
  UpdateVacancyStatusDto,
} from './dto/recruitment.dto';
import { RecruitmentService } from './recruitment.service';

@ApiTags('hr-recruitment')
@Controller('hr')
export class RecruitmentController {
  constructor(private readonly service: RecruitmentService) {}

  @Roles('HR_OFFICER', 'ADMIN')
  @Post('vacancies')
  createVacancy(
    @Body() dto: CreateVacancyDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createVacancy(dto, user);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('vacancies')
  listVacancies() {
    return this.service.listVacancies();
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('vacancies/:id')
  getVacancy(@Param('id') id: string) {
    return this.service.getVacancy(id);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Patch('vacancies/:id/status')
  updateVacancyStatus(
    @Param('id') id: string,
    @Body() dto: UpdateVacancyStatusDto,
  ) {
    return this.service.updateVacancyStatus(id, dto);
  }

  // Public, unauthenticated — deliberately throttled to prevent form
  // flooding, same stance as Stage 12's admissions apply endpoint.
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('vacancies/:id/apply')
  @ApiOperation({
    summary: 'Apply to a vacancy — unauthenticated, public endpoint',
  })
  apply(@Param('id') id: string, @Body() dto: ApplyToVacancyDto) {
    return this.service.apply(id, dto);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('candidates')
  listCandidates(@Query('vacancyId') vacancyId?: string) {
    return this.service.listCandidates(vacancyId);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Patch('candidates/:id/stage')
  updateCandidateStage(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateStageDto,
  ) {
    return this.service.updateCandidateStage(id, dto);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Post('candidates/:id/convert-to-staff')
  convertToStaff(@Param('id') id: string, @Body() dto: ConvertCandidateDto) {
    return this.service.convertToStaff(id, dto);
  }
}
