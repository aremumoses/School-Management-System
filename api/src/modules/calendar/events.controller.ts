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
import { ALL_STAFF_ROLES } from '../communication/communication-roles.constants';
import {
  CreateEventDto,
  QueryCalendarDto,
  QueryEventsDto,
  RsvpDto,
  UpdateEventDto,
} from './dto/event.dto';
import { EventsService } from './events.service';

// docs/03-roles-and-permissions.md §2 "Calendar/events" row — only
// ADMIN(F)/VICE_PRINCIPAL(E) can manage events; every other role
// (including Student/Parent) is "V".
const CAN_MANAGE_ROLES = ['ADMIN', 'VICE_PRINCIPAL'] as const;
// "guardians/staff to respond" per the prompt — Student excluded.
const CAN_RSVP_ROLES = [...ALL_STAFF_ROLES, 'PARENT' as const];

@ApiTags('calendar')
@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Roles(...CAN_MANAGE_ROLES)
  @Post('events')
  @ApiOperation({ summary: 'Create a calendar event' })
  create(@Body() dto: CreateEventDto, @CurrentUser() user: RequestUser) {
    return this.eventsService.create(dto, user);
  }

  @Roles()
  @Get('events')
  @ApiOperation({ summary: 'List events, optionally filtered by category' })
  list(@Query() query: QueryEventsDto) {
    return this.eventsService.list(query);
  }

  @Roles()
  @Get('events/:id')
  @ApiOperation({
    summary: "A single event with an RSVP tally and the caller's own response",
  })
  getOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.eventsService.getOrThrow(id, user);
  }

  @Roles(...CAN_MANAGE_ROLES)
  @Patch('events/:id')
  @ApiOperation({ summary: 'Edit an event' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.update(id, dto, user);
  }

  @Roles(...CAN_MANAGE_ROLES)
  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel/remove an event' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.eventsService.remove(id, user);
  }

  @Roles(...CAN_RSVP_ROLES)
  @Post('events/:id/rsvp')
  @ApiOperation({ summary: 'Respond to an RSVP-enabled event' })
  rsvp(
    @Param('id') id: string,
    @Body() dto: RsvpDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.rsvp(id, dto, user);
  }

  @Roles(...ALL_STAFF_ROLES)
  @Get('events/:id/rsvps')
  @ApiOperation({
    summary: 'Full RSVP respondent list — organizer or ADMIN/VP only',
  })
  getRsvps(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.eventsService.getRsvps(id, user);
  }

  @Roles()
  @Get('calendar')
  @ApiOperation({
    summary: 'Unified calendar — events combined with term/session dates',
  })
  getCalendar(@Query() query: QueryCalendarDto) {
    return this.eventsService.getCalendar(query);
  }
}
