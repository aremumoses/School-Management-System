import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { BroadcastsService } from '../communication/broadcasts.service';
import { MarkRollCallDto } from './dto/hostel.dto';

export interface RollCallEntryDto {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  present: boolean;
  /** True when present=false and no APPROVED leave request covers this date — computed live, never stored. */
  unapprovedAbsence: boolean;
}

export interface RollCallDto {
  id: string | null;
  hostelId: string;
  hostelName: string;
  date: string;
  session: 'MORNING' | 'EVENING';
  entries: RollCallEntryDto[];
}

@Injectable()
export class HostelRollCallService {
  private readonly logger = new Logger(HostelRollCallService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcasts: BroadcastsService,
  ) {}

  /** Every actively-boarded student in this hostel, with the day's roll-call status if it exists yet — defaults everyone to present, same convention as classroom attendance's marking roster. */
  async getRollCall(
    hostelId: string,
    date: string,
    session: 'MORNING' | 'EVENING',
  ): Promise<RollCallDto> {
    const hostel = await this.prisma.hostel.findUnique({
      where: { id: hostelId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const boarders = await this.prisma.bedAllocation.findMany({
      where: { room: { hostelId } },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    });

    const existing = await this.prisma.rollCall.findUnique({
      where: {
        hostelId_date_session: { hostelId, date: new Date(date), session },
      },
      include: { entries: true },
    });
    const entryByStudent = new Map(
      existing?.entries.map((e) => [e.studentId, e]) ?? [],
    );

    const approvedLeaves = await this.getApprovedLeaveStudentIds(
      boarders.map((b) => b.studentId),
      date,
    );

    const entries: RollCallEntryDto[] = boarders.map((b) => {
      const present = entryByStudent.get(b.studentId)?.present ?? true;
      return {
        studentId: b.studentId,
        firstName: b.student.firstName,
        lastName: b.student.lastName,
        admissionNumber: b.student.admissionNumber,
        present,
        unapprovedAbsence: !present && !approvedLeaves.has(b.studentId),
      };
    });

    return {
      id: existing?.id ?? null,
      hostelId,
      hostelName: hostel.name,
      date,
      session,
      entries,
    };
  }

  async mark(dto: MarkRollCallDto, user: RequestUser): Promise<RollCallDto> {
    const hostel = await this.prisma.hostel.findUnique({
      where: { id: dto.hostelId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const boarders = await this.prisma.bedAllocation.findMany({
      where: { room: { hostelId: dto.hostelId } },
      select: { studentId: true },
    });
    const boarderIds = new Set(boarders.map((b) => b.studentId));

    const entries =
      dto.entries && dto.entries.length > 0
        ? dto.entries
        : [...boarderIds].map((studentId) => ({ studentId, present: true }));

    const unknown = entries.filter((e) => !boarderIds.has(e.studentId));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `These students are not boarders of this hostel: ${unknown.map((e) => e.studentId).join(', ')}`,
      );
    }

    const date = new Date(dto.date);
    const rollCall = await this.prisma.rollCall.upsert({
      where: {
        hostelId_date_session: {
          hostelId: dto.hostelId,
          date,
          session: dto.session,
        },
      },
      update: {},
      create: {
        hostelId: dto.hostelId,
        date,
        session: dto.session,
        markedByStaffId: user.id,
      },
    });

    await this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.rollCallEntry.upsert({
          where: {
            rollCallId_studentId: {
              rollCallId: rollCall.id,
              studentId: entry.studentId,
            },
          },
          update: { present: entry.present },
          create: {
            rollCallId: rollCall.id,
            studentId: entry.studentId,
            present: entry.present,
          },
        }),
      ),
    );
    await this.prisma.rollCall.update({
      where: { id: rollCall.id },
      data: { markedByStaffId: user.id },
    });

    const approvedLeaves = await this.getApprovedLeaveStudentIds(
      entries.map((e) => e.studentId),
      dto.date,
    );
    for (const entry of entries) {
      if (!entry.present && !approvedLeaves.has(entry.studentId)) {
        this.broadcasts
          .sendUnapprovedAbsenceAlert({
            studentId: entry.studentId,
            hostelName: hostel.name,
            session: dto.session === 'MORNING' ? 'morning' : 'evening',
            date: dto.date,
          })
          .catch((error: unknown) =>
            this.logger.error(
              'UNAPPROVED_ABSENCE notice failed',
              error instanceof Error ? error.stack : String(error),
            ),
          );
      }
    }

    return this.getRollCall(dto.hostelId, dto.date, dto.session);
  }

  private async getApprovedLeaveStudentIds(
    studentIds: string[],
    date: string,
  ): Promise<Set<string>> {
    if (studentIds.length === 0) return new Set();
    const dateObj = new Date(date);
    const approved = await this.prisma.leaveOutingRequest.findMany({
      where: {
        studentId: { in: studentIds },
        status: 'APPROVED',
        fromDate: { lte: dateObj },
        toDate: { gte: dateObj },
      },
      select: { studentId: true },
    });
    return new Set(approved.map((a) => a.studentId));
  }
}
