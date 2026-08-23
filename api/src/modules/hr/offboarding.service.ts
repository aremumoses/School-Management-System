import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OffboardingChecklist, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { StaffService } from '../staff/staff.service';
import {
  InitiateOffboardingDto,
  UpdateOffboardingDto,
} from './dto/offboarding.dto';

export interface ChecklistItem {
  key: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
}

const CHECKLIST_TEMPLATE: { key: string; label: string }[] = [
  { key: 'HANDOVER', label: 'Handover confirmed' },
  { key: 'ASSETS_RETURNED', label: 'Assets returned' },
  { key: 'FINAL_PAY_COMPUTED', label: 'Final pay computed' },
];

@Injectable()
export class OffboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffService: StaffService,
  ) {}

  async initiate(
    dto: InitiateOffboardingDto,
    user: RequestUser,
  ): Promise<OffboardingChecklist> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: dto.staffId },
    });
    if (!staff) throw new NotFoundException('Staff member not found');
    if (!staff.isActive) {
      throw new BadRequestException('This staff member is already inactive');
    }

    const existing = await this.prisma.offboardingChecklist.findUnique({
      where: { staffId: dto.staffId },
    });
    if (existing) {
      throw new ConflictException(
        'Offboarding has already been initiated for this staff member',
      );
    }

    const items: ChecklistItem[] = CHECKLIST_TEMPLATE.map((t) => ({
      ...t,
      completed: false,
      completedAt: null,
    }));

    return this.prisma.offboardingChecklist.create({
      data: {
        staffId: dto.staffId,
        items: items as unknown as Prisma.InputJsonValue,
        initiatedByStaffId: user.id,
      },
    });
  }

  list() {
    return this.prisma.offboardingChecklist.findMany({
      include: {
        staff: { select: { firstName: true, lastName: true, isActive: true } },
      },
      orderBy: { initiatedAt: 'desc' },
    });
  }

  private async getOrThrow(id: string): Promise<OffboardingChecklist> {
    const checklist = await this.prisma.offboardingChecklist.findUnique({
      where: { id },
    });
    if (!checklist)
      throw new NotFoundException('Offboarding checklist not found');
    return checklist;
  }

  async update(
    id: string,
    dto: UpdateOffboardingDto,
  ): Promise<OffboardingChecklist> {
    const checklist = await this.getOrThrow(id);
    if (checklist.completedAt) {
      throw new ConflictException(
        'This offboarding has already been completed',
      );
    }

    const items = checklist.items as unknown as ChecklistItem[];
    if (dto.item) {
      const idx = items.findIndex((i) => i.key === dto.item!.key);
      if (idx === -1)
        throw new BadRequestException(
          `Unknown checklist item: ${dto.item.key}`,
        );
      items[idx] = {
        ...items[idx],
        completed: dto.item.completed,
        completedAt: dto.item.completed ? new Date().toISOString() : null,
      };
    }

    return this.prisma.offboardingChecklist.update({
      where: { id },
      data: {
        items: items as unknown as Prisma.InputJsonValue,
        ...(dto.finalPayAmount !== undefined && {
          finalPayAmount: dto.finalPayAmount,
        }),
      },
    });
  }

  /** Deactivates the staff login the instant every checklist item is done — reuses StaffService's existing deactivate path (which already revokes refresh tokens). */
  async complete(id: string, user: RequestUser): Promise<OffboardingChecklist> {
    const checklist = await this.getOrThrow(id);
    if (checklist.completedAt) {
      throw new ConflictException(
        'This offboarding has already been completed',
      );
    }

    const items = checklist.items as unknown as ChecklistItem[];
    if (!items.every((i) => i.completed)) {
      throw new BadRequestException(
        'All checklist items must be completed first',
      );
    }
    if (checklist.finalPayAmount == null) {
      throw new BadRequestException(
        'Enter the final pay amount before completing offboarding',
      );
    }

    const updated = await this.prisma.offboardingChecklist.update({
      where: { id },
      data: { completedAt: new Date() },
    });

    await this.staffService.updateStaff(
      checklist.staffId,
      { isActive: false },
      user.id,
    );

    return updated;
  }
}
