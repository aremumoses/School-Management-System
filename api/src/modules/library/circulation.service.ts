import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Loan } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { BroadcastsService } from '../communication/broadcasts.service';
import { InvoicesService } from '../fees/invoices.service';
import { CreateLoanDto, SettleFineWithInvoiceDto } from './dto/library.dto';
import { LibrarySettingsService } from './library-settings.service';

const MS_PER_DAY = 86_400_000;

export interface LoanDto {
  id: string;
  bookId: string;
  bookTitle: string;
  borrowerType: 'STUDENT' | 'STAFF';
  borrowerId: string;
  borrowerName: string;
  issuedAt: Date;
  dueDate: Date;
  returnedAt: Date | null;
  fineAmount: number | null;
  fineSettledAt: Date | null;
  fineInvoiceId: string | null;
  issuedByStaffId: string;
}

const LOAN_INCLUDE = { book: true } as const;

@Injectable()
export class CirculationService {
  private readonly logger = new Logger(CirculationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: LibrarySettingsService,
    private readonly broadcasts: BroadcastsService,
    private readonly invoicesService: InvoicesService,
  ) {}

  async issue(dto: CreateLoanDto, user: RequestUser): Promise<LoanDto> {
    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId },
    });
    if (!book) throw new NotFoundException('Book not found');

    const activeLoans = await this.prisma.loan.count({
      where: { bookId: dto.bookId, returnedAt: null },
    });
    if (activeLoans >= book.totalCopies) {
      throw new BadRequestException(
        'No copies of this book are currently available',
      );
    }

    await this.assertBorrowerExists(dto.borrowerType, dto.borrowerId);

    const policy = await this.settings.loadPolicy();
    const limit =
      dto.borrowerType === 'STUDENT'
        ? policy.studentBorrowLimit
        : policy.staffBorrowLimit;
    const loanDays =
      dto.borrowerType === 'STUDENT'
        ? policy.studentLoanDays
        : policy.staffLoanDays;

    const borrowerActiveCount = await this.prisma.loan.count({
      where: {
        borrowerType: dto.borrowerType,
        borrowerId: dto.borrowerId,
        returnedAt: null,
      },
    });
    if (borrowerActiveCount >= limit) {
      throw new BadRequestException(
        `This borrower already has ${borrowerActiveCount} book(s) out — the borrowing limit is ${limit}`,
      );
    }

    const dueDate = new Date(Date.now() + loanDays * MS_PER_DAY);

    const loan = await this.prisma.loan.create({
      data: {
        bookId: dto.bookId,
        borrowerType: dto.borrowerType,
        borrowerId: dto.borrowerId,
        issuedByStaffId: user.id,
        dueDate,
      },
      include: LOAN_INCLUDE,
    });

    // The reserver is now actually taking the book out — resolve whichever
    // non-terminal reservation they hold on this title.
    await this.prisma.reservation.updateMany({
      where: {
        bookId: dto.bookId,
        borrowerType: dto.borrowerType,
        borrowerId: dto.borrowerId,
        status: { in: ['WAITING', 'AVAILABLE'] },
      },
      data: { status: 'FULFILLED' },
    });

    return this.toDto(loan);
  }

  async return(id: string): Promise<LoanDto> {
    const loan = await this.getRawOrThrow(id);
    if (loan.returnedAt) {
      throw new BadRequestException('This loan was already returned');
    }

    const returnedAt = new Date();
    const policy = await this.settings.loadPolicy();
    const daysLate = Math.max(
      0,
      Math.ceil((returnedAt.getTime() - loan.dueDate.getTime()) / MS_PER_DAY),
    );
    const fineAmount = daysLate > 0 ? daysLate * policy.finePerDay : null;

    const updated = await this.prisma.loan.update({
      where: { id },
      data: { returnedAt, fineAmount },
      include: LOAN_INCLUDE,
    });

    await this.fulfillOldestReservation(loan.bookId);

    return this.toDto(updated);
  }

  async renew(id: string): Promise<LoanDto> {
    const loan = await this.getRawOrThrow(id);
    if (loan.returnedAt) {
      throw new BadRequestException('This loan was already returned');
    }

    const otherReservation = await this.prisma.reservation.findFirst({
      where: {
        bookId: loan.bookId,
        status: { in: ['WAITING', 'AVAILABLE'] },
        NOT: { borrowerType: loan.borrowerType, borrowerId: loan.borrowerId },
      },
    });
    if (otherReservation) {
      throw new BadRequestException(
        'This title has an active reservation from another member — it cannot be renewed',
      );
    }

    const policy = await this.settings.loadPolicy();
    const loanDays =
      loan.borrowerType === 'STUDENT'
        ? policy.studentLoanDays
        : policy.staffLoanDays;
    const dueDate = new Date(loan.dueDate.getTime() + loanDays * MS_PER_DAY);

    const updated = await this.prisma.loan.update({
      where: { id },
      data: { dueDate },
      include: LOAN_INCLUDE,
    });
    return this.toDto(updated);
  }

  async settleFineDirect(id: string): Promise<LoanDto> {
    await this.assertFineOutstanding(id);
    const updated = await this.prisma.loan.update({
      where: { id },
      data: { fineSettledAt: new Date() },
      include: LOAN_INCLUDE,
    });
    return this.toDto(updated);
  }

  async settleFineWithInvoice(
    id: string,
    dto: SettleFineWithInvoiceDto,
    user: RequestUser,
  ): Promise<LoanDto> {
    const loan = await this.assertFineOutstanding(id);
    if (loan.borrowerType !== 'STUDENT') {
      throw new BadRequestException(
        'Only student borrowers have a Fees & Payments account — settle staff fines directly',
      );
    }

    const invoice = await this.invoicesService.createIndividual(
      loan.borrowerId,
      {
        termId: dto.termId,
        description: `Library fine — ${loan.book.title}`,
        items: [
          {
            name: `Library fine — ${loan.book.title}`,
            amount: loan.fineAmount!,
          },
        ],
      },
      user,
    );

    const updated = await this.prisma.loan.update({
      where: { id },
      data: { fineInvoiceId: invoice.id },
      include: LOAN_INCLUDE,
    });
    return this.toDto(updated);
  }

  private async assertFineOutstanding(
    id: string,
  ): Promise<Loan & { book: { title: string } }> {
    const loan = await this.getRawOrThrow(id);
    if (loan.fineAmount === null) {
      throw new BadRequestException('This loan has no fine to settle');
    }
    if (loan.fineSettledAt || loan.fineInvoiceId) {
      throw new BadRequestException('This fine has already been settled');
    }
    return loan;
  }

  private async fulfillOldestReservation(bookId: string): Promise<void> {
    const oldest = await this.prisma.reservation.findFirst({
      where: { bookId, status: 'WAITING' },
      orderBy: { reservedAt: 'asc' },
    });
    if (!oldest) return;

    await this.prisma.reservation.update({
      where: { id: oldest.id },
      data: { status: 'AVAILABLE' },
    });

    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) return;
    this.broadcasts
      .sendLibraryNotice({
        borrowerType: oldest.borrowerType,
        borrowerId: oldest.borrowerId,
        templateKey: 'RESERVATION_AVAILABLE',
        context: { book_title: book.title },
        emailSubject: `Reservation available — ${book.title}`,
      })
      .catch((error: unknown) =>
        this.logger.error(
          'RESERVATION_AVAILABLE notice failed',
          error instanceof Error ? error.stack : String(error),
        ),
      );
  }

  private async assertBorrowerExists(
    borrowerType: 'STUDENT' | 'STAFF',
    borrowerId: string,
  ): Promise<void> {
    if (borrowerType === 'STUDENT') {
      const student = await this.prisma.student.findUnique({
        where: { id: borrowerId },
      });
      if (!student) throw new NotFoundException('Student not found');
    } else {
      const staff = await this.prisma.staff.findUnique({
        where: { id: borrowerId },
      });
      if (!staff) throw new NotFoundException('Staff member not found');
    }
  }

  private async getRawOrThrow(
    id: string,
  ): Promise<Loan & { book: { title: string; id: string } }> {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: LOAN_INCLUDE,
    });
    if (!loan) throw new NotFoundException('Loan not found');
    return loan;
  }

  async getBorrowerName(
    borrowerType: 'STUDENT' | 'STAFF',
    borrowerId: string,
  ): Promise<string> {
    if (borrowerType === 'STUDENT') {
      const s = await this.prisma.student.findUnique({
        where: { id: borrowerId },
      });
      return s ? `${s.firstName} ${s.lastName}` : 'Unknown student';
    }
    const s = await this.prisma.staff.findUnique({ where: { id: borrowerId } });
    return s ? `${s.firstName} ${s.lastName}` : 'Unknown staff';
  }

  async toDto(loan: Loan & { book: { title: string } }): Promise<LoanDto> {
    const borrowerName = await this.getBorrowerName(
      loan.borrowerType,
      loan.borrowerId,
    );
    return {
      id: loan.id,
      bookId: loan.bookId,
      bookTitle: loan.book.title,
      borrowerType: loan.borrowerType,
      borrowerId: loan.borrowerId,
      borrowerName,
      issuedAt: loan.issuedAt,
      dueDate: loan.dueDate,
      returnedAt: loan.returnedAt,
      fineAmount: loan.fineAmount,
      fineSettledAt: loan.fineSettledAt,
      fineInvoiceId: loan.fineInvoiceId,
      issuedByStaffId: loan.issuedByStaffId,
    };
  }
}
