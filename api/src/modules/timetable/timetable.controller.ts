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
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import {
  CreatePeriodDto,
  CreateTimetableEntryDto,
  UpdatePeriodDto,
  UpdateTimetableEntryDto,
} from './dto/timetable.dto';
import { TimetableService } from './timetable.service';

// HOD included per the permissions matrix — their "own dept" qualifier has
// no backing Department model anywhere in this codebase, so they're
// unscoped here, same as the documented ClassScopeService stance.
const BUILDER_ROLES = ['ADMIN', 'VICE_PRINCIPAL', 'HOD'] as const;

@ApiTags('timetable')
@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  // -------------------------------------------------------------------
  // Periods (slot config)
  // -------------------------------------------------------------------

  @Roles()
  @Get('periods')
  @ApiOperation({ summary: 'The school-wide period (time slot) list' })
  listPeriods() {
    return this.timetableService.listPeriods();
  }

  @Roles('ADMIN')
  @Post('periods')
  @ApiOperation({ summary: 'Add a period (e.g. "Period 1, 08:00–08:40")' })
  createPeriod(@Body() dto: CreatePeriodDto) {
    return this.timetableService.createPeriod(dto);
  }

  @Roles('ADMIN')
  @Patch('periods/:id')
  @ApiOperation({ summary: 'Update a period' })
  updatePeriod(@Param('id') id: string, @Body() dto: UpdatePeriodDto) {
    return this.timetableService.updatePeriod(id, dto);
  }

  @Roles('ADMIN')
  @Delete('periods/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a period (blocked while timetable entries use it)',
  })
  async deletePeriod(@Param('id') id: string): Promise<void> {
    await this.timetableService.deletePeriod(id);
  }

  // -------------------------------------------------------------------
  // Entries
  // -------------------------------------------------------------------

  @Roles(...BUILDER_ROLES)
  @Post('entries')
  @ApiOperation({
    summary:
      'Schedule a class-subject into a slot — 400 with a specific message if the arm, teacher, or room is already booked then',
  })
  createEntry(@Body() dto: CreateTimetableEntryDto) {
    return this.timetableService.createEntry(dto);
  }

  @Roles(...BUILDER_ROLES)
  @Patch('entries/:id')
  @ApiOperation({
    summary: 'Move/edit an entry — re-runs the same conflict checks',
  })
  updateEntry(@Param('id') id: string, @Body() dto: UpdateTimetableEntryDto) {
    return this.timetableService.updateEntry(id, dto);
  }

  @Roles(...BUILDER_ROLES)
  @Delete('entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an entry from the timetable' })
  async deleteEntry(@Param('id') id: string): Promise<void> {
    await this.timetableService.deleteEntry(id);
  }

  // -------------------------------------------------------------------
  // Grids
  // -------------------------------------------------------------------

  // Declared before 'arm/:armId' can't swallow it — literal paths first.
  @Roles('STUDENT')
  @Get('me')
  @ApiQuery({ name: 'termId', required: false })
  @ApiOperation({
    summary:
      "The logged-in student's own week grid, resolved from their current enrollment — no armId needed",
  })
  getMyGrid(
    @Query('termId') termId: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.timetableService.getMyGrid(termId, user);
  }

  @Roles()
  @Get('arm/:armId')
  @ApiQuery({ name: 'termId', required: false })
  @ApiOperation({
    summary:
      "One arm's full week grid (staff: any arm; student/parent: own/ward's arm only)",
  })
  getArmGrid(
    @Param('armId') armId: string,
    @Query('termId') termId: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.timetableService.getArmGrid(armId, termId, user);
  }

  @Roles(
    'ADMIN',
    'VICE_PRINCIPAL',
    'HOD',
    'EXAM_OFFICER',
    'CLASS_TEACHER',
    'SUBJECT_TEACHER',
  )
  @Get('staff/:staffId')
  @ApiQuery({ name: 'termId', required: false })
  @ApiOperation({
    summary:
      "A teacher's full week grid, every arm they're scheduled in merged into one view",
  })
  getStaffGrid(
    @Param('staffId') staffId: string,
    @Query('termId') termId: string | undefined,
  ) {
    return this.timetableService.getStaffGrid(staffId, termId);
  }
}
