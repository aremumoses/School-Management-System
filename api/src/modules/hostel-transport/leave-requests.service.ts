import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { RequestUser } from '../../common/types/auth.types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLeaveRequestDto, DecideLeaveRequestDto } from './dto/hostel.dto';

const REQUEST_INCLUDE = {
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNumber: true,
    },
  },
  requestedBy: { select: { id: true, firstName: true, lastName: true } },
  decidedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class LeaveRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeaveRequestDto, user: RequestUser) {
    const link = await this.prisma.studentGuardian.findFirst({
      where: { guardianId: user.id, studentId: dto.studentId },
    });
    if (!link) {
      throw new BadRequestException(
        'You can only request leave for your own ward',
      );
    }
    const fromDate = new Date(dto.fromDate);
    const toDate = new Date(dto.toDate);
    if (toDate < fromDate) {
      throw new BadRequestException('toDate cannot be before fromDate');
    }

    return this.prisma.leaveOutingRequest.create({
      data: {
        studentId: dto.studentId,
        requestedByGuardianId: user.id,
        fromDate,
        toDate,
        reason: dto.reason,
      },
      include: REQUEST_INCLUDE,
    });
  }

  list(studentId?: string, status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.prisma.leaveOutingRequest.findMany({
      where: {
        ...(studentId && { studentId }),
        ...(status && { status }),
      },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Own-ward requests for a parent's leave-requests page. */
  async listForGuardian(guardianId: string) {
    const links = await this.prisma.studentGuardian.findMany({
      where: { guardianId },
      select: { studentId: true },
    });
    const studentIds = links.map((l) => l.studentId);
    if (studentIds.length === 0) return [];
    return this.prisma.leaveOutingRequest.findMany({
      where: { studentId: { in: studentIds } },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async decide(id: string, dto: DecideLeaveRequestDto, user: RequestUser) {
    const request = await this.prisma.leaveOutingRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Leave request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('This request has already been decided');
    }
    if (dto.decision === 'REJECTED' && !dto.notes?.trim()) {
      throw new BadRequestException(
        'A reason is required when rejecting a request',
      );
    }

    return this.prisma.leaveOutingRequest.update({
      where: { id },
      data: {
        status: dto.decision,
        decidedByStaffId: user.id,
        decisionNotes: dto.notes?.trim() || null,
        decidedAt: new Date(),
      },
      include: REQUEST_INCLUDE,
    });
  }
}
