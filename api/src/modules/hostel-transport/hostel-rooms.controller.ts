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
  AllocateBedDto,
  CreateHostelDto,
  CreateRoomDto,
  UpdateHostelDto,
  UpdateRoomDto,
} from './dto/hostel.dto';
import { HostelRoomsService } from './hostel-rooms.service';

const MANAGE_ROLES = ['HOSTEL_WARDEN', 'ADMIN'] as const;

@ApiTags('hostel')
@Controller('hostel')
export class HostelRoomsController {
  constructor(private readonly hostelRoomsService: HostelRoomsService) {}

  @Roles(...MANAGE_ROLES)
  @Get('hostels')
  @ApiOperation({
    summary: 'Every hostel/house with its rooms and current bed occupancy',
  })
  listHostels() {
    return this.hostelRoomsService.listHostels();
  }

  @Roles('ADMIN')
  @Post('hostels')
  @ApiOperation({ summary: 'Add a hostel/house' })
  createHostel(@Body() dto: CreateHostelDto) {
    return this.hostelRoomsService.createHostel(dto);
  }

  @Roles('ADMIN')
  @Patch('hostels/:id')
  @ApiOperation({ summary: 'Edit a hostel/house' })
  updateHostel(@Param('id') id: string, @Body() dto: UpdateHostelDto) {
    return this.hostelRoomsService.updateHostel(id, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Post('rooms')
  @ApiOperation({ summary: 'Add a room to a hostel' })
  createRoom(@Body() dto: CreateRoomDto) {
    return this.hostelRoomsService.createRoom(dto);
  }

  @Roles(...MANAGE_ROLES)
  @Patch('rooms/:id')
  @ApiOperation({ summary: 'Edit a room' })
  updateRoom(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.hostelRoomsService.updateRoom(id, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Post('rooms/:id/allocate')
  @ApiOperation({
    summary:
      'Assign a boarder to a bed — rejects if the bed or student is already allocated',
  })
  allocateBed(@Param('id') roomId: string, @Body() dto: AllocateBedDto) {
    return this.hostelRoomsService.allocateBed(roomId, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Delete('bed-allocations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Vacate a bed' })
  async vacateBed(@Param('id') id: string): Promise<void> {
    await this.hostelRoomsService.vacateBed(id);
  }

  @Roles(...MANAGE_ROLES)
  @Get('boarders')
  @ApiQuery({ name: 'hostelId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiOperation({
    summary: 'The boarder roster, derived from active bed allocations',
  })
  listBoarders(
    @Query('hostelId') hostelId?: string,
    @Query('search') search?: string,
  ) {
    return this.hostelRoomsService.listBoarders(hostelId, search);
  }
}
