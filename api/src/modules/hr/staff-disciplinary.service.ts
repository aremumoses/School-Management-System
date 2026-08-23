import { Injectable, NotFoundException } from '@nestjs/common';
import type { StaffDisciplinaryRecord } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { CreateStaffDisciplinaryRecordDto } from './dto/staff-disciplinary.dto';

@Injectable()
export class StaffDisciplinaryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateStaffDisciplinaryRecordDto,
    user: RequestUser,
  ): Promise<StaffDisciplinaryRecord> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: dto.staffId },
    });
    if (!staff) throw new NotFoundException('Staff member not found');

    return this.prisma.staffDisciplinaryRecord.create({
      data: {
        staffId: dto.staffId,
        description: dto.description,
        actionTaken: dto.actionTaken,
        loggedByStaffId: user.id,
      },
    });
  }

  list(staffId?: string) {
    return this.prisma.staffDisciplinaryRecord.findMany({
      where: { ...(staffId && { staffId }) },
      include: {
        staff: { select: { firstName: true, lastName: true } },
        loggedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { loggedAt: 'desc' },
    });
  }
}
