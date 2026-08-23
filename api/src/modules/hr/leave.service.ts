import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { LeaveBalance, LeaveRequest, LeaveType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { BroadcastsService } from '../communication/broadcasts.service';
import {
  CreateHrLeaveRequestDto,
  CreateLeaveTypeDto,
  DecideHrLeaveRequestDto,
  UpdateLeaveTypeDto,
  UpsertLeaveBalanceDto,
} from './dto/leave.dto';

const MS_PER_DAY = 86_400_000;

/** Inclusive day count — a request from Monday to Wednesday is 3 days off, not 2. */
function inclusiveDayCount(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY) + 1;
}

export interface ActiveLeaveInfo {
  fromDate: string;
  toDate: string;
  leaveTypeName: string;
}

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcasts: BroadcastsService,
  ) {}

  // -------------------------------------------------------------------
  // Leave types
  // -------------------------------------------------------------------

  listLeaveTypes(): Promise<LeaveType[]> {
    return this.prisma.leaveType.findMany({ orderBy: { name: 'asc' } });
  }

  createLeaveType(dto: CreateLeaveTypeDto): Promise<LeaveType> {
    return this.prisma.leaveType.create({ data: dto });
  }

  async updateLeaveType(
    id: string,
    dto: UpdateLeaveTypeDto,
  ): Promise<LeaveType> {
    const type = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!type) throw new NotFoundException('Leave type not found');
    return this.prisma.leaveType.update({ where: { id }, data: dto });
  }

  // -------------------------------------------------------------------
  // Leave balances
  // -------------------------------------------------------------------

  /** Auto-provisions a balance row from the leave type's default the first time it's needed for a staff/year pair. */
  private async getOrCreateBalance(
    staffId: string,
    leaveTypeId: string,
    year: number,
  ): Promise<LeaveBalance> {
    const existing = await this.prisma.leaveBalance.findUnique({
      where: { staffId_leaveTypeId_year: { staffId, leaveTypeId, year } },
    });
    if (existing) return existing;

    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    return this.prisma.leaveBalance.create({
      data: {
        staffId,
        leaveTypeId,
        year,
        allocatedDays: leaveType.defaultAnnualDays,
      },
    });
  }

  async listBalancesForStaff(
    staffId: string,
    year: number,
  ): Promise<LeaveBalance[]> {
    const types = await this.listLeaveTypes();
    return Promise.all(
      types.map((t) => this.getOrCreateBalance(staffId, t.id, year)),
    );
  }

  listAllBalances(year: number) {
    return this.prisma.leaveBalance.findMany({
      where: { year },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
        leaveType: { select: { name: true } },
      },
      orderBy: [{ staff: { firstName: 'asc' } }],
    });
  }

  async upsertBalance(dto: UpsertLeaveBalanceDto): Promise<LeaveBalance> {
    const [staff, leaveType] = await Promise.all([
      this.prisma.staff.findUnique({ where: { id: dto.staffId } }),
      this.prisma.leaveType.findUnique({ where: { id: dto.leaveTypeId } }),
    ]);
    if (!staff) throw new NotFoundException('Staff member not found');
    if (!leaveType) throw new NotFoundException('Leave type not found');

    return this.prisma.leaveBalance.upsert({
      where: {
        staffId_leaveTypeId_year: {
          staffId: dto.staffId,
          leaveTypeId: dto.leaveTypeId,
          year: dto.year,
        },
      },
      update: { allocatedDays: dto.allocatedDays },
      create: {
        staffId: dto.staffId,
        leaveTypeId: dto.leaveTypeId,
        year: dto.year,
        allocatedDays: dto.allocatedDays,
      },
    });
  }

  // -------------------------------------------------------------------
  // Leave requests
  // -------------------------------------------------------------------

  async create(
    dto: CreateHrLeaveRequestDto,
    user: RequestUser,
  ): Promise<LeaveRequest> {
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: dto.leaveTypeId },
    });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    const fromDate = new Date(dto.fromDate);
    const toDate = new Date(dto.toDate);
    if (toDate < fromDate) {
      throw new BadRequestException('toDate cannot be before fromDate');
    }
    const requestedDays = inclusiveDayCount(fromDate, toDate);
    const year = fromDate.getFullYear();

    const balance = await this.getOrCreateBalance(
      user.id,
      dto.leaveTypeId,
      year,
    );
    // Warn, don't hard-block — HR decides with full information rather than
    // the system silently rejecting a legitimate exception request.
    const exceedsBalance =
      balance.usedDays + requestedDays > balance.allocatedDays;

    const request = await this.prisma.leaveRequest.create({
      data: {
        staffId: user.id,
        leaveTypeId: dto.leaveTypeId,
        fromDate,
        toDate,
        reason: dto.reason,
        exceedsBalance,
      },
      include: { staff: true },
    });

    this.broadcasts
      .sendLeaveRequestPendingAlert({
        staffName: `${request.staff.firstName} ${request.staff.lastName}`,
        leaveType: leaveType.name,
        fromDate: dto.fromDate,
        toDate: dto.toDate,
        targetId: request.id,
      })
      .catch((error: unknown) =>
        this.logger.error(
          'LEAVE_REQUEST_PENDING notice failed',
          error instanceof Error ? error.stack : String(error),
        ),
      );

    return request;
  }

  listMyRequests(staffId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { staffId },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAllRequests(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.prisma.leaveRequest.findMany({
      where: { ...(status && { status }) },
      include: {
        leaveType: true,
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async decide(
    id: string,
    dto: DecideHrLeaveRequestDto,
    user: RequestUser,
  ): Promise<LeaveRequest> {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true },
    });
    if (!request) throw new NotFoundException('Leave request not found');
    if (request.status !== 'PENDING') {
      throw new ConflictException(
        'This leave request has already been decided.',
      );
    }
    if (dto.decision === 'REJECTED' && !dto.decisionNotes?.trim()) {
      throw new BadRequestException(
        'A reason is required when rejecting a leave request.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: dto.decision,
          decidedByStaffId: user.id,
          decisionNotes: dto.decisionNotes,
          decidedAt: new Date(),
        },
      });

      if (dto.decision === 'APPROVED') {
        const requestedDays = inclusiveDayCount(
          request.fromDate,
          request.toDate,
        );
        const year = request.fromDate.getFullYear();
        await tx.leaveBalance.upsert({
          where: {
            staffId_leaveTypeId_year: {
              staffId: request.staffId,
              leaveTypeId: request.leaveTypeId,
              year,
            },
          },
          update: { usedDays: { increment: requestedDays } },
          create: {
            staffId: request.staffId,
            leaveTypeId: request.leaveTypeId,
            year,
            allocatedDays: request.leaveType.defaultAnnualDays,
            usedDays: requestedDays,
          },
        });
      }

      return result;
    });

    this.broadcasts
      .sendLeaveDecidedNotice({
        staffId: request.staffId,
        leaveType: request.leaveType.name,
        fromDate: request.fromDate.toISOString().slice(0, 10),
        toDate: request.toDate.toISOString().slice(0, 10),
        decision: dto.decision,
        decisionNotes: dto.decisionNotes,
        targetId: request.id,
      })
      .catch((error: unknown) =>
        this.logger.error(
          'LEAVE_DECIDED notice failed',
          error instanceof Error ? error.stack : String(error),
        ),
      );

    return updated;
  }

  // -------------------------------------------------------------------
  // Cross-module read for TimetableService — "flag the covered period on
  // the teacher's TimetableEntry view" (docs §3 sample workflow). A
  // read-side join, not a new write to the timetable itself.
  // -------------------------------------------------------------------

  async getCurrentApprovedLeave(
    staffId: string,
  ): Promise<ActiveLeaveInfo | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const leave = await this.prisma.leaveRequest.findFirst({
      where: { staffId, status: 'APPROVED', toDate: { gte: today } },
      include: { leaveType: true },
      orderBy: { fromDate: 'asc' },
    });
    if (!leave) return null;

    return {
      fromDate: leave.fromDate.toISOString().slice(0, 10),
      toDate: leave.toDate.toISOString().slice(0, 10),
      leaveTypeName: leave.leaveType.name,
    };
  }
}
