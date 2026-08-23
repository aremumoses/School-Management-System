import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Club } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { translatePrismaError } from '../../common/utils/prisma-error';
import type { RequestUser } from '../../common/types/auth.types';
import { AddClubMemberDto, CreateClubDto, UpdateClubDto } from './dto/club.dto';

const CLUB_INCLUDE = {
  patron: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { memberships: true } },
} as const;

@Injectable()
export class ClubsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClubDto): Promise<Club> {
    try {
      return await this.prisma.club.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          meetingSchedule: dto.meetingSchedule ?? null,
          patronStaffId: dto.patronStaffId ?? null,
        },
        include: CLUB_INCLUDE,
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'A club with this name already exists',
      );
    }
  }

  async update(id: string, dto: UpdateClubDto): Promise<Club> {
    await this.getOrThrow(id);
    try {
      return await this.prisma.club.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.meetingSchedule !== undefined && {
            meetingSchedule: dto.meetingSchedule,
          }),
          ...(dto.patronStaffId !== undefined && {
            patronStaffId: dto.patronStaffId || null,
          }),
        },
        include: CLUB_INCLUDE,
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'A club with this name already exists',
      );
    }
  }

  list() {
    return this.prisma.club.findMany({
      orderBy: { name: 'asc' },
      include: CLUB_INCLUDE,
    });
  }

  async getOrThrow(id: string) {
    const club = await this.prisma.club.findUnique({
      where: { id },
      include: {
        ...CLUB_INCLUDE,
        memberships: {
          orderBy: { joinedAt: 'asc' },
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
      },
    });
    if (!club) throw new NotFoundException('Club not found');
    return club;
  }

  async addMember(clubId: string, dto: AddClubMemberDto) {
    await this.getOrThrow(clubId);
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student || !student.isActive) {
      throw new NotFoundException('Student not found');
    }
    try {
      return await this.prisma.clubMembership.create({
        data: { clubId, studentId: dto.studentId },
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'This student is already a member of the club',
      );
    }
  }

  async removeMember(clubId: string, studentId: string): Promise<void> {
    const membership = await this.prisma.clubMembership.findUnique({
      where: { clubId_studentId: { clubId, studentId } },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    await this.prisma.clubMembership.delete({ where: { id: membership.id } });
  }

  /** A student's own clubs — students see only theirs, guardians only a ward's. */
  async listForStudent(studentId: string, user: RequestUser) {
    if (user.userType === 'STUDENT' && user.id !== studentId) {
      throw new ForbiddenException('You can only view your own clubs');
    }
    if (user.userType === 'GUARDIAN') {
      const link = await this.prisma.studentGuardian.findUnique({
        where: {
          studentId_guardianId: { studentId, guardianId: user.id },
        },
      });
      if (!link) {
        throw new ForbiddenException("You can only view your own ward's clubs");
      }
    }

    const memberships = await this.prisma.clubMembership.findMany({
      where: { studentId },
      orderBy: { joinedAt: 'asc' },
      include: {
        club: {
          include: {
            patron: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    return memberships.map((m) => ({
      membershipId: m.id,
      joinedAt: m.joinedAt,
      ...m.club,
    }));
  }
}
