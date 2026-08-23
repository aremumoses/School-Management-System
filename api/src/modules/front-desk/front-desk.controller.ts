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
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import ExcelJS from 'exceljs';
import {
  createSheet,
  sendExcelResponse,
} from '../../common/excel/excel-export.util';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import {
  AddPickupPersonDto,
  CreatePickupRequestDto,
  IssueGatePassDto,
  LogAssetMovementDto,
  LogFacilityIncidentDto,
  LogLateArrivalDto,
  ResolveGatePassDto,
  SignInVisitorDto,
} from './dto/front-desk.dto';
import { FrontDeskService } from './front-desk.service';

const GATE_ROLES = ['FRONT_DESK', 'ADMIN'] as const;
const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function formatDateTime(value: Date | null): string {
  return value
    ? value.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
}

/** Parent-owned pickup authorization, mounted under /students. */
@ApiTags('front-desk')
@Controller('students')
export class PickupAuthorizationController {
  constructor(private readonly frontDeskService: FrontDeskService) {}

  @Roles('FRONT_DESK', 'ADMIN', 'HOSTEL_WARDEN')
  @Get('qr/:qrToken')
  @ApiOperation({
    summary:
      "Stage 29 digital ID — resolve a scanned QR code to the student's bio-data and authorized pickup list in one call",
  })
  resolveByQrToken(@Param('qrToken') qrToken: string) {
    return this.frontDeskService.resolveByQrToken(qrToken);
  }

  @Roles('PARENT', ...GATE_ROLES, 'VICE_PRINCIPAL')
  @Get(':id/pickup-persons')
  @ApiOperation({
    summary:
      "A student's authorized pickup list — readable by their parent and front-desk/admin only",
  })
  listPickupPersons(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.frontDeskService.listPickupPersons(id, user);
  }

  @Roles('PARENT')
  @Post(':id/pickup-persons')
  @ApiOperation({ summary: 'Add an authorized pickup person (own child only)' })
  addPickupPerson(
    @Param('id') id: string,
    @Body() dto: AddPickupPersonDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.frontDeskService.addPickupPerson(id, dto, user);
  }

  @Roles('PARENT')
  @Delete(':id/pickup-persons/:personId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an authorized pickup person' })
  async removePickupPerson(
    @Param('id') id: string,
    @Param('personId') personId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.frontDeskService.removePickupPerson(id, personId, user);
  }

  @Roles('PARENT')
  @Post(':id/pickup-requests')
  @ApiOperation({
    summary:
      'Submit an early-pickup request ahead of time — lands in the front-desk pending queue',
  })
  createPickupRequest(
    @Param('id') id: string,
    @Body() dto: CreatePickupRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.frontDeskService.createPickupRequest(id, dto, user);
  }
}

@ApiTags('front-desk')
@Controller()
export class FrontDeskController {
  constructor(private readonly frontDeskService: FrontDeskService) {}

  // ---- Overview ----

  @Roles(...GATE_ROLES)
  @Get('front-desk/overview')
  @ApiQuery({ name: 'date', required: false })
  @ApiOperation({
    summary:
      "Today's gate numbers: visitors, students out on pass, late arrivals, pending requests, escalations",
  })
  overview(@Query('date') date?: string) {
    return this.frontDeskService.getOverview(date);
  }

  // ---- Pickup requests queue ----

  @Roles(...GATE_ROLES, 'PARENT')
  @Get('pickup-requests')
  @ApiOperation({
    summary:
      "Front desk: the pending queue. Parents: their own requests' status.",
  })
  listPickupRequests(@CurrentUser() user: RequestUser) {
    return this.frontDeskService.listPickupRequests(user);
  }

  // ---- Visitors ----

  @Roles(...GATE_ROLES)
  @Post('visitors/sign-in')
  @ApiOperation({ summary: 'Sign a visitor in' })
  signIn(@Body() dto: SignInVisitorDto) {
    return this.frontDeskService.signInVisitor(dto);
  }

  @Roles(...GATE_ROLES)
  @Get('visitors/export')
  @ApiProduces(EXCEL_MIME)
  @ApiQuery({ name: 'date', required: false })
  @ApiOperation({ summary: "Export a day's visitor log as Excel" })
  async exportVisitors(
    @Res() res: Response,
    @Query('date') date?: string,
  ): Promise<void> {
    const visitors = await this.frontDeskService.listVisitors(date);
    const wb = new ExcelJS.Workbook();
    const sheet = createSheet(wb, 'Visitors', [
      'Name',
      'Phone',
      'Reason',
      'Host',
      'Signed In',
      'Signed Out',
    ]);
    for (const v of visitors) {
      sheet.addRow([
        v.name,
        v.phone,
        v.reason,
        v.hostStaff ? `${v.hostStaff.firstName} ${v.hostStaff.lastName}` : '',
        formatDateTime(v.signedInAt),
        formatDateTime(v.signedOutAt),
      ]);
    }
    await sendExcelResponse(res, wb, `visitors-${Date.now()}.xlsx`);
  }

  @Roles(...GATE_ROLES)
  @Get('visitors')
  @ApiQuery({ name: 'date', required: false })
  @ApiOperation({ summary: "A day's visitor log (defaults to today)" })
  listVisitors(@Query('date') date?: string) {
    return this.frontDeskService.listVisitors(date);
  }

  @Roles(...GATE_ROLES)
  @Post('visitors/:id/sign-out')
  @ApiOperation({ summary: 'Sign a visitor out' })
  signOut(@Param('id') id: string) {
    return this.frontDeskService.signOutVisitor(id);
  }

  // ---- Gate pass ----

  @Roles(...GATE_ROLES)
  @Post('gate-pass')
  @ApiOperation({
    summary:
      'Issue a gate pass — auto-verifies against the authorized pickup list; a non-match creates an ESCALATED record and notifies Admin',
  })
  issueGatePass(
    @Body() dto: IssueGatePassDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.frontDeskService.issueGatePass(dto, user);
  }

  @Roles(...GATE_ROLES)
  @Get('gate-pass/export')
  @ApiProduces(EXCEL_MIME)
  @ApiQuery({ name: 'date', required: false })
  @ApiOperation({ summary: "Export a day's gate-pass log as Excel" })
  async exportGatePasses(
    @Res() res: Response,
    @Query('date') date?: string,
  ): Promise<void> {
    const passes = await this.frontDeskService.listGatePasses(date);
    const wb = new ExcelJS.Workbook();
    const sheet = createSheet(wb, 'Gate Passes', [
      'Student',
      'Admission No.',
      'Pickup Person',
      'Phone',
      'Verified',
      'Status',
      'Issued By',
      'Issued At',
    ]);
    for (const p of passes) {
      sheet.addRow([
        `${p.student.firstName} ${p.student.lastName}`,
        p.student.admissionNumber,
        p.pickupPersonName,
        p.pickupPersonPhone ?? '',
        p.verifiedAgainstAuthorizedList ? 'Yes' : 'No',
        p.status,
        `${p.issuedBy.firstName} ${p.issuedBy.lastName}`,
        formatDateTime(p.issuedAt),
      ]);
    }
    await sendExcelResponse(res, wb, `gate-passes-${Date.now()}.xlsx`);
  }

  @Roles(...GATE_ROLES)
  @Get('gate-pass')
  @ApiQuery({ name: 'date', required: false })
  @ApiOperation({ summary: "A day's gate-pass log (defaults to today)" })
  listGatePasses(@Query('date') date?: string) {
    return this.frontDeskService.listGatePasses(date);
  }

  @Roles('ADMIN')
  @Post('gate-pass/:id/resolve')
  @ApiOperation({
    summary: 'Admin resolves an ESCALATED pass — confirm (issue) or reject',
  })
  resolveGatePass(@Param('id') id: string, @Body() dto: ResolveGatePassDto) {
    return this.frontDeskService.resolveGatePass(id, dto);
  }

  // ---- Late arrivals ----

  @Roles(...GATE_ROLES)
  @Post('late-arrivals')
  @ApiOperation({
    summary:
      'Log a late arrival — Class-Teacher notification is an explicit opt-in flag',
  })
  logLateArrival(@Body() dto: LogLateArrivalDto) {
    return this.frontDeskService.logLateArrival(dto);
  }

  @Roles(...GATE_ROLES)
  @Get('late-arrivals')
  @ApiQuery({ name: 'date', required: false })
  @ApiOperation({ summary: "A day's late-arrival log (defaults to today)" })
  listLateArrivals(@Query('date') date?: string) {
    return this.frontDeskService.listLateArrivals(date);
  }

  // ---- Facility incidents ----

  @Roles(...GATE_ROLES)
  @Post('facility-incidents')
  @ApiOperation({
    summary:
      'Log a gate/facility security incident — no student tie required (distinct from discipline incidents)',
  })
  logFacilityIncident(
    @Body() dto: LogFacilityIncidentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.frontDeskService.logFacilityIncident(dto, user);
  }

  @Roles(...GATE_ROLES)
  @Get('facility-incidents/export')
  @ApiProduces(EXCEL_MIME)
  @ApiOperation({ summary: 'Export the incident log as Excel' })
  async exportFacilityIncidents(@Res() res: Response): Promise<void> {
    const incidents = await this.frontDeskService.listFacilityIncidents();
    const wb = new ExcelJS.Workbook();
    const sheet = createSheet(wb, 'Facility Incidents', [
      'Type',
      'Description',
      'Parties Involved',
      'Action Taken',
      'Logged By',
      'Logged At',
    ]);
    for (const i of incidents) {
      sheet.addRow([
        i.type,
        i.description,
        i.partiesInvolved ?? '',
        i.actionTaken ?? '',
        `${i.loggedBy.firstName} ${i.loggedBy.lastName}`,
        formatDateTime(i.loggedAt),
      ]);
    }
    await sendExcelResponse(res, wb, `facility-incidents-${Date.now()}.xlsx`);
  }

  @Roles(...GATE_ROLES)
  @Get('facility-incidents')
  @ApiOperation({ summary: 'The facility incident log' })
  listFacilityIncidents() {
    return this.frontDeskService.listFacilityIncidents();
  }

  // ---- Asset movements ----

  @Roles(...GATE_ROLES)
  @Post('asset-movements')
  @ApiOperation({ summary: 'Log an asset leaving/entering the premises' })
  logAssetMovement(
    @Body() dto: LogAssetMovementDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.frontDeskService.logAssetMovement(dto, user);
  }

  @Roles(...GATE_ROLES)
  @Get('asset-movements')
  @ApiOperation({ summary: 'The asset movement log' })
  listAssetMovements() {
    return this.frontDeskService.listAssetMovements();
  }
}
