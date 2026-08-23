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
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AllocateSeatsDto,
  CreateExamHallDto,
  CreateExamSessionDto,
  ManualSeatAllocationDto,
  UpdateExamHallDto,
  UpdateExamSessionDto,
} from './dto/exam-logistics.dto';
import { ExamSessionsService } from './exam-sessions.service';

const MANAGE_ROLES = ['EXAM_OFFICER', 'ADMIN'] as const;

@ApiTags('exam-sessions')
@Controller('exam-sessions')
export class ExamSessionsController {
  constructor(private readonly examSessionsService: ExamSessionsService) {}

  // -------------------------------------------------------------------
  // Halls — declared before the generic ':id' routes below so
  // 'GET /exam-sessions/halls' doesn't get swallowed as id="halls".
  // -------------------------------------------------------------------

  @Roles(...MANAGE_ROLES)
  @Get('halls')
  @ApiOperation({ summary: 'Every exam hall (name + capacity)' })
  listHalls() {
    return this.examSessionsService.listHalls();
  }

  @Roles(...MANAGE_ROLES)
  @Post('halls')
  @ApiOperation({ summary: 'Add an exam hall' })
  createHall(@Body() dto: CreateExamHallDto) {
    return this.examSessionsService.createHall(dto);
  }

  @Roles(...MANAGE_ROLES)
  @Patch('halls/:hallId')
  @ApiOperation({ summary: 'Update an exam hall' })
  updateHall(@Param('hallId') hallId: string, @Body() dto: UpdateExamHallDto) {
    return this.examSessionsService.updateHall(hallId, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Delete('halls/:hallId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an exam hall (blocked while it has seat allocations)',
  })
  async deleteHall(@Param('hallId') hallId: string): Promise<void> {
    await this.examSessionsService.deleteHall(hallId);
  }

  // -------------------------------------------------------------------
  // Sessions
  // -------------------------------------------------------------------

  @Roles(...MANAGE_ROLES)
  @Post()
  @ApiOperation({
    summary:
      'Schedule an exam session — 400 if it clashes with the regular class timetable or another exam session for the same arm',
  })
  create(@Body() dto: CreateExamSessionDto) {
    return this.examSessionsService.create(dto);
  }

  @Roles(...MANAGE_ROLES)
  @Get()
  @ApiQuery({ name: 'termId', required: false })
  @ApiQuery({ name: 'armId', required: false })
  @ApiOperation({
    summary: 'The exam timetable, optionally filtered by term/arm',
  })
  list(@Query('termId') termId?: string, @Query('armId') armId?: string) {
    return this.examSessionsService.list(termId, armId);
  }

  @Roles(...MANAGE_ROLES)
  @Get(':id')
  @ApiOperation({ summary: 'One exam session' })
  getOne(@Param('id') id: string) {
    return this.examSessionsService.getOne(id);
  }

  @Roles(...MANAGE_ROLES)
  @Patch(':id')
  @ApiOperation({
    summary:
      'Reschedule/edit an exam session — re-runs the same conflict checks',
  })
  update(@Param('id') id: string, @Body() dto: UpdateExamSessionDto) {
    return this.examSessionsService.update(id, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel an exam session' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.examSessionsService.delete(id);
  }

  // -------------------------------------------------------------------
  // Seat allocation
  // -------------------------------------------------------------------

  @Roles(...MANAGE_ROLES)
  @Get(':id/seat-allocations')
  @ApiOperation({ summary: 'The seating plan for one exam session' })
  getSeatAllocations(@Param('id') id: string) {
    return this.examSessionsService.getSeatAllocations(id);
  }

  @Roles(...MANAGE_ROLES)
  @Post(':id/allocate-seats')
  @ApiOperation({
    summary:
      'Auto-assign seats sequentially across the given halls, by capacity — replaces any previous allocation for this session',
  })
  autoAllocate(@Param('id') id: string, @Body() dto: AllocateSeatsDto) {
    return this.examSessionsService.autoAllocate(id, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Post(':id/seat-allocations')
  @ApiOperation({ summary: 'Manual seat override for one student' })
  manualAllocate(
    @Param('id') id: string,
    @Body() dto: ManualSeatAllocationDto,
  ) {
    return this.examSessionsService.manualAllocate(id, dto);
  }
}
