import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import {
  ApproveActionDto,
  CreateIncidentDto,
  ProposeActionDto,
  QueryIncidentsDto,
  RejectActionDto,
  UpdateIncidentDto,
} from './dto/incident.dto';
import { IncidentsService } from './incidents.service';

// docs/03-roles-and-permissions.md §2 "Discipline" row — every role with
// at least "E" (write) access, i.e. allowed to log an incident at all.
const CAN_LOG_ROLES = [
  'ADMIN',
  'VICE_PRINCIPAL',
  'CLASS_TEACHER',
  'SUBJECT_TEACHER',
  'HOSTEL_WARDEN',
] as const;

// Same list minus SUBJECT_TEACHER — the matrix's "log only" qualifier
// means a Subject Teacher can create an Incident but not propose a
// disciplinary action on it.
const CAN_PROPOSE_ACTION_ROLES = [
  'ADMIN',
  'VICE_PRINCIPAL',
  'CLASS_TEACHER',
  'HOSTEL_WARDEN',
] as const;

@ApiTags('discipline')
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Roles(...CAN_LOG_ROLES)
  @Post()
  @ApiOperation({ summary: 'Log a disciplinary incident for a student' })
  create(@Body() dto: CreateIncidentDto, @CurrentUser() user: RequestUser) {
    return this.incidentsService.create(dto, user);
  }

  // Open to any authenticated user — IncidentsService scopes/denies per
  // docs §2's row (Student sees only their own, Parent only their ward's,
  // Bursar/Librarian/Transport/HR get none at all).
  @Roles()
  @Get()
  @ApiOperation({
    summary: 'List incidents, scoped to what the caller may see',
  })
  list(@Query() query: QueryIncidentsDto, @CurrentUser() user: RequestUser) {
    return this.incidentsService.list(query, user);
  }

  @Roles()
  @Get(':id')
  @ApiOperation({ summary: 'A single incident with its action history' })
  getOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.incidentsService.getOrThrow(id, user);
  }

  @Roles(...CAN_LOG_ROLES)
  @Patch(':id')
  @ApiOperation({
    summary:
      "Edit an incident's description/severity (reporter or unscoped roles only)",
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.incidentsService.update(id, dto, user);
  }

  @Roles(...CAN_PROPOSE_ACTION_ROLES)
  @Post(':id/actions')
  @ApiOperation({
    summary:
      'Propose a disciplinary action — WARNING finalizes immediately, SUSPENSION/EXPULSION require ADMIN approval',
  })
  proposeAction(
    @Param('id') incidentId: string,
    @Body() dto: ProposeActionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.incidentsService.proposeAction(incidentId, dto, user);
  }

  @Roles('ADMIN')
  @Post(':id/actions/:actionId/approve')
  @ApiOperation({
    summary:
      'Finalize a proposed SUSPENSION/EXPULSION — triggers the guardian notification',
  })
  approveAction(
    @Param('id') incidentId: string,
    @Param('actionId') actionId: string,
    @Body() dto: ApproveActionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.incidentsService.approveAction(incidentId, actionId, dto, user);
  }

  @Roles('ADMIN')
  @Post(':id/actions/:actionId/reject')
  @ApiOperation({
    summary:
      'Decline a proposed SUSPENSION/EXPULSION — no notification is sent',
  })
  rejectAction(
    @Param('id') incidentId: string,
    @Param('actionId') actionId: string,
    @Body() dto: RejectActionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.incidentsService.rejectAction(incidentId, actionId, dto, user);
  }
}
