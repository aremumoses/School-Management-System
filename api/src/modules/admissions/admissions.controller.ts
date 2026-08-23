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
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { AdmissionsService } from './admissions.service';
import {
  ApplyDto,
  ConvertApplicantDto,
  QueryApplicantsDto,
  ReviewApplicantDto,
} from './dto/admissions.dto';

@ApiTags('admissions')
@Controller('admissions')
export class AdmissionsController {
  constructor(private readonly admissionsService: AdmissionsService) {}

  // Stage 12 — deliberately public but throttled to prevent form flooding.
  // Mirrors Stage 11's approach for /auth/login: ThrottlerModule.forRoot()
  // in the module provides the storage; @UseGuards(ThrottlerGuard) binds it
  // here specifically rather than globally. skipIf in the module config
  // disables it under NODE_ENV=test so the e2e suite isn't blocked.
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('apply')
  @ApiOperation({
    summary:
      'Submit an admission application — unauthenticated, public endpoint',
  })
  apply(@Body() dto: ApplyDto) {
    return this.admissionsService.apply(dto);
  }

  // Public status lookup — applicants use the ID on their confirmation screen
  // to check progress without needing a portal account. Only returns safe
  // public fields; sensitive reviewer notes and admin detail are omitted.
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('status/:id')
  @ApiOperation({
    summary:
      'Public status check — returns minimal applicant status for the confirmation screen',
  })
  async getStatus(@Param('id') id: string) {
    const applicant = await this.admissionsService.getOrThrow(id);
    return {
      id: applicant.id,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      status: applicant.status,
      applicationFeePaid: applicant.applicationFeePaid,
      offerLetterUrl: applicant.offerLetterUrl,
    };
  }

  // docs/03 §2's "Admissions" row gives HR Officer V — Stage 31 audit found
  // list/get were ADMIN/VICE_PRINCIPAL-only, leaving HR with no visibility
  // the matrix grants them (view-only, no review/convert access below).
  @Roles('ADMIN', 'VICE_PRINCIPAL', 'HR_OFFICER')
  @Get()
  @ApiOperation({ summary: 'List applicants, optionally filtered by status' })
  list(@Query() query: QueryApplicantsDto) {
    return this.admissionsService.list(query);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL', 'HR_OFFICER')
  @Get(':id')
  @ApiOperation({ summary: 'Full applicant detail including fee transactions' })
  get(@Param('id') id: string) {
    return this.admissionsService.getOrThrow(id);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Patch(':id/review')
  @ApiOperation({
    summary: 'Review an applicant: move to UNDER_REVIEW, APPROVED, or REJECTED',
  })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewApplicantDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admissionsService.review(id, dto, user);
  }

  // docs/03 §2 gives VICE_PRINCIPAL "E" on both Admissions and Student
  // records — review (above) already includes VP; convert (which creates
  // the Student + Guardian records) hadn't, blocking VP from completing an
  // enrollment they were otherwise able to approve. Stage 31 audit fix.
  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Post(':id/convert')
  @ApiOperation({
    summary:
      'Convert an APPROVED applicant into an enrolled Student — triggers guardian account creation and welcome notification',
  })
  convert(
    @Param('id') id: string,
    @Body() dto: ConvertApplicantDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admissionsService.convert(id, dto, user);
  }

  // Public — the applicant isn't logged in yet on the confirmation screen;
  // rate-limited and guarded by the hard-to-guess applicant cuid.
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':id/application-fee/checkout')
  @ApiOperation({
    summary:
      'Start a Paystack checkout for the application fee — public, used from the /apply confirmation screen',
  })
  initiateApplicationFee(@Param('id') id: string) {
    return this.admissionsService.initiateApplicationFee(id);
  }
}
