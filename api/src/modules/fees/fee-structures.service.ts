import { Injectable, NotFoundException } from '@nestjs/common';
import type { FeeComponent, FeeStructure } from '@prisma/client';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { translatePrismaError } from '../../common/utils/prisma-error';
import {
  AddFeeComponentDto,
  CreateFeeStructureDto,
  UpdateFeeComponentDto,
} from './dto/fee-structure.dto';

type FeeStructureWithComponents = FeeStructure & { components: FeeComponent[] };

@Injectable()
export class FeeStructuresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * One structure per (class, term) — docs §1. Multiple structures for
   * different class levels in the same term are independent rows, so
   * nothing here blocks that; the `@@unique([classId, termId])` constraint
   * only blocks two structures for the *same* class+term.
   */
  async create(
    dto: CreateFeeStructureDto,
    user: RequestUser,
  ): Promise<FeeStructureWithComponents> {
    await this.assertClassExists(dto.classId);
    await this.assertTermExists(dto.termId);

    let structure: FeeStructureWithComponents;
    try {
      structure = await this.prisma.feeStructure.create({
        data: {
          classId: dto.classId,
          termId: dto.termId,
          components: {
            create: dto.components.map((c) => ({
              name: c.name,
              amount: c.amount,
              type: c.type,
            })),
          },
        },
        include: { components: true },
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'A fee structure already exists for this class and term — edit its components instead of creating a second one.',
      );
    }

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'FEE_STRUCTURE_CREATED',
      entityType: 'FeeStructure',
      entityId: structure.id,
      afterJson: {
        classId: dto.classId,
        termId: dto.termId,
        components: dto.components,
      },
    });

    return structure;
  }

  async list(query: {
    classId?: string;
    termId?: string;
  }): Promise<FeeStructureWithComponents[]> {
    return this.prisma.feeStructure.findMany({
      where: {
        classId: query.classId,
        termId: query.termId,
      },
      include: { components: true },
      orderBy: [{ termId: 'asc' }, { classId: 'asc' }],
    });
  }

  async getOrThrow(id: string): Promise<FeeStructureWithComponents> {
    const structure = await this.prisma.feeStructure.findUnique({
      where: { id },
      include: { components: true },
    });
    if (!structure) throw new NotFoundException('Fee structure not found');
    return structure;
  }

  async addComponent(
    structureId: string,
    dto: AddFeeComponentDto,
    user: RequestUser,
  ): Promise<FeeComponent> {
    await this.getOrThrow(structureId);
    let component: FeeComponent;
    try {
      component = await this.prisma.feeComponent.create({
        data: {
          feeStructureId: structureId,
          name: dto.name,
          amount: dto.amount,
          type: dto.type,
        },
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'A component with this name already exists on this structure',
      );
    }

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'FEE_COMPONENT_ADDED',
      entityType: 'FeeComponent',
      entityId: component.id,
      afterJson: { ...component },
    });
    return component;
  }

  async updateComponent(
    id: string,
    dto: UpdateFeeComponentDto,
    user: RequestUser,
  ): Promise<FeeComponent> {
    const existing = await this.getComponentOrThrow(id);
    let updated: FeeComponent;
    try {
      updated = await this.prisma.feeComponent.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'A component with this name already exists on this structure',
      );
    }

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'FEE_COMPONENT_UPDATED',
      entityType: 'FeeComponent',
      entityId: id,
      beforeJson: { ...existing },
      afterJson: { ...updated },
    });
    return updated;
  }

  async deleteComponent(id: string, user: RequestUser): Promise<void> {
    const existing = await this.getComponentOrThrow(id);
    // No explicit "is it already invoiced" check needed — InvoiceLineItem's
    // feeComponentId is nullable + SetNull, so deleting a component that's
    // already been snapshotted onto past invoices is safe; it just orphans
    // the traceability link, not the invoice's own name/amount.
    await this.prisma.feeComponent.delete({ where: { id } });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'FEE_COMPONENT_DELETED',
      entityType: 'FeeComponent',
      entityId: id,
      beforeJson: { ...existing },
    });
  }

  private async getComponentOrThrow(id: string): Promise<FeeComponent> {
    const component = await this.prisma.feeComponent.findUnique({
      where: { id },
    });
    if (!component) throw new NotFoundException('Fee component not found');
    return component;
  }

  private async assertClassExists(classId: string): Promise<void> {
    const exists = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!exists) throw new NotFoundException('Class not found');
  }

  private async assertTermExists(termId: string): Promise<void> {
    const exists = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!exists) throw new NotFoundException('Term not found');
  }
}
