import { Injectable, NotFoundException } from '@nestjs/common';
import type { Notice } from '@prisma/client';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { translatePrismaError } from '../../common/utils/prisma-error';
import type { RequestUser } from '../../common/types/auth.types';
import {
  CreateNoticeDto,
  QueryNoticesDto,
  UpdateNoticeDto,
} from './dto/notice.dto';

@Injectable()
export class NoticesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** docs §9 — browsable by date (newest first) and category. */
  list(query: QueryNoticesDto): Promise<Notice[]> {
    return this.prisma.notice.findMany({
      where: query.category ? { category: query.category } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrThrow(id: string): Promise<Notice> {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice) throw new NotFoundException('Notice not found');
    return notice;
  }

  async create(dto: CreateNoticeDto, user: RequestUser): Promise<Notice> {
    const notice = await this.prisma.notice.create({
      data: {
        title: dto.title,
        body: dto.body,
        category: dto.category,
        createdByStaffId: user.id,
      },
    });
    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'NOTICE_CREATED',
      entityType: 'Notice',
      entityId: notice.id,
      afterJson: { title: notice.title, category: notice.category },
    });
    return notice;
  }

  async update(
    id: string,
    dto: UpdateNoticeDto,
    user: RequestUser,
  ): Promise<Notice> {
    const existing = await this.getOrThrow(id);
    let updated: Notice;
    try {
      updated = await this.prisma.notice.update({
        where: { id },
        data: { title: dto.title, body: dto.body, category: dto.category },
      });
    } catch (error) {
      return translatePrismaError(error, 'Notice not found');
    }
    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'NOTICE_UPDATED',
      entityType: 'Notice',
      entityId: id,
      beforeJson: { title: existing.title, category: existing.category },
      afterJson: { title: updated.title, category: updated.category },
    });
    return updated;
  }

  async remove(id: string, user: RequestUser): Promise<void> {
    const existing = await this.getOrThrow(id);
    await this.prisma.notice.delete({ where: { id } });
    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'NOTICE_DELETED',
      entityType: 'Notice',
      entityId: id,
      beforeJson: { title: existing.title, category: existing.category },
    });
  }
}
