import { Injectable } from '@nestjs/common';
import type { UserType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface WriteAuditLogEntry {
  actorId: string | null;
  actorType: UserType;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeJson?: unknown;
  afterJson?: unknown;
}

/**
 * Shared append-only audit trail (docs/18-technical-architecture.md §8).
 * AuthService keeps its own private writeAuditLog for its own
 * self-referential actions (LOGIN/LOGOUT/REFRESH) — this one is for
 * cross-module use where the actor and the affected entity are different
 * things (e.g. an Exam Officer unlocking someone else's Score).
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async write(entry: WriteAuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        actorType: entry.actorType,
        actorRole: entry.actorRole,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeJson: entry.beforeJson as never,
        afterJson: entry.afterJson as never,
      },
    });
  }

  async list(opts: {
    entityType?: string;
    actorId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
    const where = {
      ...(opts.entityType ? { entityType: opts.entityType } : {}),
      ...(opts.actorId ? { actorId: opts.actorId } : {}),
      ...(opts.from || opts.to
        ? {
            createdAt: {
              ...(opts.from ? { gte: new Date(opts.from) } : {}),
              ...(opts.to ? { lte: new Date(opts.to) } : {}),
            },
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }
}
