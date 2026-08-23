import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { ReservationStatus } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateReservationDto } from './dto/library.dto';
import { ReservationsService } from './reservations.service';

const MANAGE_ROLES = ['LIBRARIAN', 'ADMIN'] as const;

@ApiTags('library')
@Controller('library')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Roles('LIBRARIAN')
  @Post('books/:id/reserve')
  @ApiOperation({
    summary:
      'Reserve a currently-checked-out title for a member — rejected if the book actually has copies available',
  })
  create(@Param('id') bookId: string, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(bookId, dto);
  }

  @Roles(...MANAGE_ROLES)
  @Get('reservations')
  @ApiQuery({ name: 'status', required: false })
  @ApiOperation({
    summary: 'Active reservations, optionally filtered by status',
  })
  list(@Query('status') status?: ReservationStatus) {
    return this.reservationsService.list(status);
  }
}
