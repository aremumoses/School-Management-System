import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { ConsentFormsService } from './consent-forms.service';
import {
  CreateConsentFormDto,
  RespondConsentFormDto,
} from './dto/consent-form.dto';

@ApiTags('consent-forms')
@Controller('consent-forms')
export class ConsentFormsController {
  constructor(private readonly consentFormsService: ConsentFormsService) {}

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'CLASS_TEACHER')
  @Post()
  @ApiOperation({
    summary:
      'Send a consent form — whole-school (Admin/VP) or one arm (a Class Teacher may only target their own)',
  })
  create(@Body() dto: CreateConsentFormDto, @CurrentUser() user: RequestUser) {
    return this.consentFormsService.create(dto, user);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'CLASS_TEACHER', 'PARENT')
  @Get()
  @ApiOperation({
    summary:
      "List consent forms — staff see their own (Admin/VP all) with tallies; guardians see ones targeting their wards with each ward's response",
  })
  list(@CurrentUser() user: RequestUser) {
    return this.consentFormsService.list(user);
  }

  @Roles('PARENT')
  @Post(':id/respond')
  @ApiOperation({
    summary:
      'E-sign for one ward: consent or decline with a typed full-name signature (one response per student, upsert)',
  })
  respond(
    @Param('id') id: string,
    @Body() dto: RespondConsentFormDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.consentFormsService.respond(id, dto, user);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'CLASS_TEACHER')
  @Get(':id/responses')
  @ApiOperation({
    summary:
      "Tally + full respondent list, including targeted students whose guardians haven't responded",
  })
  getResponses(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.consentFormsService.getResponses(id, user);
  }
}
