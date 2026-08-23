import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { RequestUser } from '../../common/types/auth.types';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateHealthLogDto,
  CreateInventoryItemDto,
  LogVisitationDto,
  UpdateInventoryItemDto,
} from './dto/hostel.dto';

const VISITATION_INCLUDE = {
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNumber: true,
    },
  },
  loggedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class HostelCareService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------
  // Visitation log
  // -------------------------------------------------------------------

  async logVisitation(dto: LogVisitationDto, user: RequestUser) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    // Informational only — visiting isn't the same authorization list as
    // pickup (front-desk.service.ts's issueGatePass), so a non-match never
    // blocks logging a legitimate visit (grandparent, family friend, etc.).
    const authorized = await this.prisma.authorizedPickupPerson.findMany({
      where: { studentId: dto.studentId },
    });
    const nameNeedle = dto.visitorName.trim().toLowerCase();
    const matched = authorized.some(
      (p) => p.name.trim().toLowerCase() === nameNeedle,
    );

    return this.prisma.visitation.create({
      data: {
        studentId: dto.studentId,
        visitorName: dto.visitorName.trim(),
        relationship: dto.relationship.trim(),
        visitedAt: new Date(dto.visitedAt),
        matchedAuthorizedPickupPerson: matched,
        loggedByStaffId: user.id,
      },
      include: VISITATION_INCLUDE,
    });
  }

  listVisitations(studentId?: string) {
    return this.prisma.visitation.findMany({
      where: { ...(studentId && { studentId }) },
      include: VISITATION_INCLUDE,
      orderBy: { visitedAt: 'desc' },
    });
  }

  // -------------------------------------------------------------------
  // Inventory
  // -------------------------------------------------------------------

  async createInventoryItem(dto: CreateInventoryItemDto) {
    if (!dto.roomId && !dto.studentId) {
      throw new BadRequestException('Provide either roomId or studentId');
    }
    if (dto.roomId && dto.studentId) {
      throw new BadRequestException(
        'Provide only one of roomId or studentId, not both',
      );
    }
    if (dto.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: dto.roomId },
      });
      if (!room) throw new NotFoundException('Room not found');
    }
    if (dto.studentId) {
      const student = await this.prisma.student.findUnique({
        where: { id: dto.studentId },
      });
      if (!student) throw new NotFoundException('Student not found');
    }
    return this.prisma.hostelInventoryItem.create({
      data: {
        roomId: dto.roomId ?? null,
        studentId: dto.studentId ?? null,
        description: dto.description,
        condition: dto.condition,
      },
    });
  }

  async updateInventoryItem(id: string, dto: UpdateInventoryItemDto) {
    const item = await this.prisma.hostelInventoryItem.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    return this.prisma.hostelInventoryItem.update({
      where: { id },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.condition !== undefined && { condition: dto.condition }),
      },
    });
  }

  listInventory(roomId?: string, studentId?: string) {
    return this.prisma.hostelInventoryItem.findMany({
      where: {
        ...(roomId && { roomId }),
        ...(studentId && { studentId }),
      },
      include: {
        room: { include: { hostel: true } },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  // -------------------------------------------------------------------
  // Boarder health log
  // -------------------------------------------------------------------

  async createHealthLog(dto: CreateHealthLogDto, user: RequestUser) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');
    return this.prisma.boarderHealthLog.create({
      data: {
        studentId: dto.studentId,
        occurredAt: new Date(dto.occurredAt),
        description: dto.description,
        actionTaken: dto.actionTaken,
        loggedByStaffId: user.id,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        loggedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  listHealthLogs(studentId?: string) {
    return this.prisma.boarderHealthLog.findMany({
      where: { ...(studentId && { studentId }) },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        loggedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: 'desc' },
    });
  }
}
