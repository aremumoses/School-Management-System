import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { StaffAttendance } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { QueryStaffAttendanceDto } from './dto/staff-attendance.dto';

const HR_ROLES = ['HR_OFFICER', 'ADMIN'];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class StaffAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async clockIn(user: RequestUser): Promise<StaffAttendance> {
    const date = startOfToday();
    const existing = await this.prisma.staffAttendance.findUnique({
      where: { staffId_date: { staffId: user.id, date } },
    });
    if (existing?.clockIn) {
      throw new ConflictException('Already clocked in today');
    }
    return this.prisma.staffAttendance.upsert({
      where: { staffId_date: { staffId: user.id, date } },
      update: { clockIn: new Date() },
      create: { staffId: user.id, date, clockIn: new Date() },
    });
  }

  async clockOut(user: RequestUser): Promise<StaffAttendance> {
    const date = startOfToday();
    const existing = await this.prisma.staffAttendance.findUnique({
      where: { staffId_date: { staffId: user.id, date } },
    });
    if (!existing?.clockIn) {
      throw new BadRequestException('Clock in before clocking out');
    }
    if (existing.clockOut) {
      throw new ConflictException('Already clocked out today');
    }
    return this.prisma.staffAttendance.update({
      where: { id: existing.id },
      data: { clockOut: new Date() },
    });
  }

  getToday(user: RequestUser): Promise<StaffAttendance | null> {
    return this.prisma.staffAttendance.findUnique({
      where: { staffId_date: { staffId: user.id, date: startOfToday() } },
    });
  }

  query(dto: QueryStaffAttendanceDto, requester: RequestUser) {
    const isHr = requester.roles.some((r) => HR_ROLES.includes(r));
    if (!isHr && dto.staffId && dto.staffId !== requester.id) {
      throw new ForbiddenException(
        'You can only view your own attendance record',
      );
    }
    // Non-HR callers always see only their own record, even if they omit
    // staffId; HR/Admin can see everyone unless they narrow it themselves.
    const targetStaffId = isHr ? dto.staffId : requester.id;

    return this.prisma.staffAttendance.findMany({
      where: {
        ...(targetStaffId && { staffId: targetStaffId }),
        ...(dto.from || dto.to
          ? {
              date: {
                ...(dto.from && { gte: new Date(dto.from) }),
                ...(dto.to && { lte: new Date(dto.to) }),
              },
            }
          : {}),
      },
      include: { staff: { select: { firstName: true, lastName: true } } },
      orderBy: { date: 'desc' },
    });
  }
}
