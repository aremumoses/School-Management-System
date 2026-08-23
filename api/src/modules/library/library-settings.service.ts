import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateLibraryPolicyDto } from './dto/library.dto';

export interface LibraryLoanPolicy {
  studentLoanDays: number;
  staffLoanDays: number;
  studentBorrowLimit: number;
  staffBorrowLimit: number;
  finePerDay: number;
}

// Sensible out-of-the-box behavior before a librarian configures anything
// — same "never throw, fall back to a default" stance as
// grading.service.ts's UNGRADED constant.
const DEFAULT_POLICY: LibraryLoanPolicy = {
  studentLoanDays: 14,
  staffLoanDays: 30,
  studentBorrowLimit: 2,
  staffBorrowLimit: 5,
  finePerDay: 50,
};

@Injectable()
export class LibrarySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async loadPolicy(): Promise<LibraryLoanPolicy> {
    const school = await this.prisma.school.findFirst();
    const stored =
      school?.libraryLoanPolicy as Partial<LibraryLoanPolicy> | null;
    return { ...DEFAULT_POLICY, ...stored };
  }

  async updatePolicy(dto: UpdateLibraryPolicyDto): Promise<LibraryLoanPolicy> {
    const school = await this.prisma.school.findFirst();
    const policy: LibraryLoanPolicy = {
      studentLoanDays: dto.studentLoanDays,
      staffLoanDays: dto.staffLoanDays,
      studentBorrowLimit: dto.studentBorrowLimit,
      staffBorrowLimit: dto.staffBorrowLimit,
      finePerDay: dto.finePerDay,
    };
    if (school) {
      await this.prisma.school.update({
        where: { id: school.id },
        data: { libraryLoanPolicy: policy as unknown as Prisma.InputJsonValue },
      });
    }
    return policy;
  }
}
