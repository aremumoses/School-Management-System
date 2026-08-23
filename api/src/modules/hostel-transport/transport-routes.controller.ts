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
  CreateRouteAssignmentDto,
  CreateRouteDto,
  CreateRouteStopDto,
  CreateTransportStaffRecordDto,
  UpdateRouteDto,
  UpdateRouteStopDto,
  UpdateTransportStaffRecordDto,
} from './dto/transport.dto';
import { TransportRoutesService } from './transport-routes.service';

const MANAGE_ROLES = ['TRANSPORT_OFFICER', 'ADMIN'] as const;

@ApiTags('transport')
@Controller('transport')
export class TransportRoutesController {
  constructor(private readonly routesService: TransportRoutesService) {}

  // --- Driver/conductor records — declared before ':id'-shaped dynamic
  // routes below aren't an issue here since these all live under distinct
  // literal prefixes ('staff-records', 'assignments'), but kept grouped
  // together for readability. ---

  @Roles(...MANAGE_ROLES)
  @Get('staff-records')
  @ApiQuery({ name: 'role', required: false, enum: ['DRIVER', 'CONDUCTOR'] })
  @ApiOperation({ summary: 'Driver/conductor directory' })
  listStaffRecords(@Query('role') role?: 'DRIVER' | 'CONDUCTOR') {
    return this.routesService.listStaffRecords(role);
  }

  @Roles(...MANAGE_ROLES)
  @Post('staff-records')
  @ApiOperation({ summary: 'Add a driver/conductor record' })
  createStaffRecord(@Body() dto: CreateTransportStaffRecordDto) {
    return this.routesService.createStaffRecord(dto);
  }

  @Roles(...MANAGE_ROLES)
  @Patch('staff-records/:id')
  @ApiOperation({
    summary: 'Edit a driver/conductor record — e.g. flip verified',
  })
  updateStaffRecord(
    @Param('id') id: string,
    @Body() dto: UpdateTransportStaffRecordDto,
  ) {
    return this.routesService.updateStaffRecord(id, dto);
  }

  // --- Student-route assignment ---

  @Roles(...MANAGE_ROLES)
  @Get('assignments')
  @ApiQuery({ name: 'routeId', required: false })
  @ApiOperation({
    summary: 'Student-route assignments, optionally filtered by route',
  })
  listAssignments(@Query('routeId') routeId?: string) {
    return this.routesService.listAssignments(routeId);
  }

  @Roles(...MANAGE_ROLES)
  @Post('assignments')
  @ApiOperation({ summary: 'Assign (or reassign) a student to a route + stop' })
  assignStudent(@Body() dto: CreateRouteAssignmentDto) {
    return this.routesService.assignStudent(dto);
  }

  @Roles(...MANAGE_ROLES)
  @Delete('assignments/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a student's route assignment" })
  async removeAssignment(@Param('studentId') studentId: string): Promise<void> {
    await this.routesService.removeAssignment(studentId);
  }

  // --- Routes & stops ---

  @Roles(...MANAGE_ROLES)
  @Get('routes')
  @ApiOperation({
    summary: 'Every transport route with its stops and rider count',
  })
  listRoutes() {
    return this.routesService.listRoutes();
  }

  @Roles(...MANAGE_ROLES)
  @Post('routes')
  @ApiOperation({ summary: 'Add a route' })
  createRoute(@Body() dto: CreateRouteDto) {
    return this.routesService.createRoute(dto);
  }

  @Roles(...MANAGE_ROLES)
  @Get('routes/:id')
  @ApiOperation({ summary: 'One route' })
  getRoute(@Param('id') id: string) {
    return this.routesService.getRoute(id);
  }

  @Roles(...MANAGE_ROLES)
  @Patch('routes/:id')
  @ApiOperation({ summary: 'Edit a route — name, bus, driver, conductor' })
  updateRoute(@Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.routesService.updateRoute(id, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Post('routes/:id/stops')
  @ApiOperation({ summary: 'Add a stop to a route' })
  createStop(@Param('id') routeId: string, @Body() dto: CreateRouteStopDto) {
    return this.routesService.createStop(routeId, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Patch('stops/:id')
  @ApiOperation({ summary: 'Edit a stop' })
  updateStop(@Param('id') id: string, @Body() dto: UpdateRouteStopDto) {
    return this.routesService.updateStop(id, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Delete('stops/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a stop (blocked while students are assigned to it)',
  })
  async deleteStop(@Param('id') id: string): Promise<void> {
    await this.routesService.deleteStop(id);
  }
}
