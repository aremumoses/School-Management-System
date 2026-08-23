import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Reservation, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CirculationService } from './circulation.service';
import { CreateReservationDto } from './dto/library.dto';

export interface ReservationDto {
  id: string;
  bookId: string;
  bookTitle: string;
  borrowerType: 'STUDENT' | 'STAFF';
  borrowerId: string;
  borrowerName: string;
  reservedAt: Date;
  status: ReservationStatus;
}

const RESERVATION_INCLUDE = { book: true } as const;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circulation: CirculationService,
  ) {}

  async create(
    bookId: string,
    dto: CreateReservationDto,
  ): Promise<ReservationDto> {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');

    const activeLoans = await this.prisma.loan.count({
      where: { bookId, returnedAt: null },
    });
    if (activeLoans < book.totalCopies) {
      throw new BadRequestException(
        'This book has copies available — issue a loan instead of reserving it',
      );
    }

    const existing = await this.prisma.reservation.findFirst({
      where: {
        bookId,
        borrowerType: dto.borrowerType,
        borrowerId: dto.borrowerId,
        status: { in: ['WAITING', 'AVAILABLE'] },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'This member already has an active reservation on this book',
      );
    }

    const reservation = await this.prisma.reservation.create({
      data: {
        bookId,
        borrowerType: dto.borrowerType,
        borrowerId: dto.borrowerId,
      },
      include: RESERVATION_INCLUDE,
    });
    return this.toDto(reservation);
  }

  async list(status?: ReservationStatus): Promise<ReservationDto[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: { ...(status && { status }) },
      include: RESERVATION_INCLUDE,
      orderBy: { reservedAt: 'asc' },
    });
    return Promise.all(reservations.map((r) => this.toDto(r)));
  }

  private async toDto(
    reservation: Reservation & { book: { title: string } },
  ): Promise<ReservationDto> {
    const borrowerName = await this.circulation.getBorrowerName(
      reservation.borrowerType,
      reservation.borrowerId,
    );
    return {
      id: reservation.id,
      bookId: reservation.bookId,
      bookTitle: reservation.book.title,
      borrowerType: reservation.borrowerType,
      borrowerId: reservation.borrowerId,
      borrowerName,
      reservedAt: reservation.reservedAt,
      status: reservation.status,
    };
  }
}
