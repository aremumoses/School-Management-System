import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Hostel, Room } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { translatePrismaError } from '../../common/utils/prisma-error';
import {
  AllocateBedDto,
  CreateHostelDto,
  CreateRoomDto,
  UpdateHostelDto,
  UpdateRoomDto,
} from './dto/hostel.dto';

export interface BoarderRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  className: string | null;
  armName: string | null;
  hostelId: string;
  hostelName: string;
  roomNumber: string;
  bedNumber: number;
  allocatedAt: Date;
}

const ROOM_INCLUDE = {
  bedAllocations: {
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
  },
} as const;

@Injectable()
export class HostelRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------
  // Hostels
  // -------------------------------------------------------------------

  listHostels() {
    return this.prisma.hostel.findMany({
      include: {
        warden: { select: { id: true, firstName: true, lastName: true } },
        rooms: { include: ROOM_INCLUDE },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createHostel(dto: CreateHostelDto): Promise<Hostel> {
    try {
      return await this.prisma.hostel.create({
        data: { name: dto.name, wardenStaffId: dto.wardenStaffId ?? null },
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'A hostel with this name already exists',
      );
    }
  }

  async updateHostel(id: string, dto: UpdateHostelDto): Promise<Hostel> {
    await this.getHostelOrThrow(id);
    try {
      return await this.prisma.hostel.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.wardenStaffId !== undefined && {
            wardenStaffId: dto.wardenStaffId,
          }),
        },
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'A hostel with this name already exists',
      );
    }
  }

  private async getHostelOrThrow(id: string): Promise<Hostel> {
    const hostel = await this.prisma.hostel.findUnique({ where: { id } });
    if (!hostel) throw new NotFoundException('Hostel not found');
    return hostel;
  }

  // -------------------------------------------------------------------
  // Rooms
  // -------------------------------------------------------------------

  async createRoom(dto: CreateRoomDto): Promise<Room> {
    const hostel = await this.prisma.hostel.findUnique({
      where: { id: dto.hostelId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');
    try {
      return await this.prisma.room.create({
        data: {
          hostelId: dto.hostelId,
          roomNumber: dto.roomNumber,
          bedCapacity: dto.bedCapacity,
        },
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'This hostel already has a room with this number',
      );
    }
  }

  async updateRoom(id: string, dto: UpdateRoomDto): Promise<Room> {
    await this.getRoomOrThrow(id);
    try {
      return await this.prisma.room.update({
        where: { id },
        data: {
          ...(dto.roomNumber !== undefined && { roomNumber: dto.roomNumber }),
          ...(dto.bedCapacity !== undefined && {
            bedCapacity: dto.bedCapacity,
          }),
        },
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'This hostel already has a room with this number',
      );
    }
  }

  private async getRoomOrThrow(id: string): Promise<Room> {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  // -------------------------------------------------------------------
  // Bed allocation
  // -------------------------------------------------------------------

  async allocateBed(roomId: string, dto: AllocateBedDto) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (dto.bedNumber > room.bedCapacity) {
      throw new BadRequestException(
        `This room only has ${room.bedCapacity} bed(s)`,
      );
    }
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const bedTaken = await this.prisma.bedAllocation.findFirst({
      where: { roomId, bedNumber: dto.bedNumber },
    });
    if (bedTaken) {
      throw new BadRequestException(
        `Bed ${dto.bedNumber} in this room is already occupied`,
      );
    }
    const studentAlreadyAllocated = await this.prisma.bedAllocation.findUnique({
      where: { studentId: dto.studentId },
    });
    if (studentAlreadyAllocated) {
      throw new BadRequestException(
        'This student already has a bed allocated — vacate it first',
      );
    }

    return this.prisma.bedAllocation.create({
      data: { roomId, bedNumber: dto.bedNumber, studentId: dto.studentId },
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
  }

  async vacateBed(allocationId: string): Promise<void> {
    const allocation = await this.prisma.bedAllocation.findUnique({
      where: { id: allocationId },
    });
    if (!allocation) throw new NotFoundException('Bed allocation not found');
    await this.prisma.bedAllocation.delete({ where: { id: allocationId } });
  }

  // -------------------------------------------------------------------
  // Boarder roster — derived from active BedAllocations
  // -------------------------------------------------------------------

  async listBoarders(
    hostelId?: string,
    search?: string,
  ): Promise<BoarderRow[]> {
    const allocations = await this.prisma.bedAllocation.findMany({
      where: {
        ...(hostelId && { room: { hostelId } }),
      },
      include: {
        room: { include: { hostel: true } },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            enrollments: {
              where: { status: 'ACTIVE' },
              take: 1,
              include: { class: true, arm: true },
            },
          },
        },
      },
      orderBy: [
        { room: { hostel: { name: 'asc' } } },
        { room: { roomNumber: 'asc' } },
      ],
    });

    let rows: BoarderRow[] = allocations.map((a) => ({
      studentId: a.studentId,
      firstName: a.student.firstName,
      lastName: a.student.lastName,
      admissionNumber: a.student.admissionNumber,
      className: a.student.enrollments[0]?.class.name ?? null,
      armName: a.student.enrollments[0]?.arm.name ?? null,
      hostelId: a.room.hostelId,
      hostelName: a.room.hostel.name,
      roomNumber: a.room.roomNumber,
      bedNumber: a.bedNumber,
      allocatedAt: a.allocatedAt,
    }));

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
          r.admissionNumber.toLowerCase().includes(q) ||
          (r.className ?? '').toLowerCase().includes(q) ||
          r.roomNumber.toLowerCase().includes(q),
      );
    }

    return rows;
  }
}
