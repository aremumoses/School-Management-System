import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CirculationService, LoanDto } from './circulation.service';
import { LibrarySettingsService } from './library-settings.service';

export interface MemberSearchRow {
  borrowerType: 'STUDENT' | 'STAFF';
  borrowerId: string;
  name: string;
  identifier: string;
}

export interface MemberDetailDto extends MemberSearchRow {
  borrowLimit: number;
  activeLoans: LoanDto[];
  history: LoanDto[];
}

const LOAN_INCLUDE = { book: true } as const;

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circulation: CirculationService,
    private readonly settings: LibrarySettingsService,
  ) {}

  async search(query: string): Promise<MemberSearchRow[]> {
    const [students, staff] = await Promise.all([
      this.prisma.student.findMany({
        where: {
          isActive: true,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { admissionNumber: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 20,
      }),
      this.prisma.staff.findMany({
        where: {
          isActive: true,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 20,
      }),
    ]);

    return [
      ...students.map((s) => ({
        borrowerType: 'STUDENT' as const,
        borrowerId: s.id,
        name: `${s.firstName} ${s.lastName}`,
        identifier: s.admissionNumber,
      })),
      ...staff.map((s) => ({
        borrowerType: 'STAFF' as const,
        borrowerId: s.id,
        name: `${s.firstName} ${s.lastName}`,
        identifier: s.email,
      })),
    ];
  }

  async getDetail(
    borrowerType: 'STUDENT' | 'STAFF',
    borrowerId: string,
  ): Promise<MemberDetailDto> {
    let name: string;
    let identifier: string;
    if (borrowerType === 'STUDENT') {
      const student = await this.prisma.student.findUnique({
        where: { id: borrowerId },
      });
      if (!student) throw new NotFoundException('Student not found');
      name = `${student.firstName} ${student.lastName}`;
      identifier = student.admissionNumber;
    } else {
      const staff = await this.prisma.staff.findUnique({
        where: { id: borrowerId },
      });
      if (!staff) throw new NotFoundException('Staff member not found');
      name = `${staff.firstName} ${staff.lastName}`;
      identifier = staff.email;
    }

    const policy = await this.settings.loadPolicy();
    const borrowLimit =
      borrowerType === 'STUDENT'
        ? policy.studentBorrowLimit
        : policy.staffBorrowLimit;

    const loans = await this.prisma.loan.findMany({
      where: { borrowerType, borrowerId },
      include: LOAN_INCLUDE,
      orderBy: { issuedAt: 'desc' },
    });
    const loanDtos = await Promise.all(
      loans.map((l) => this.circulation.toDto(l)),
    );

    return {
      borrowerType,
      borrowerId,
      name,
      identifier,
      borrowLimit,
      activeLoans: loanDtos.filter((l) => l.returnedAt === null),
      history: loanDtos.filter((l) => l.returnedAt !== null),
    };
  }
}
