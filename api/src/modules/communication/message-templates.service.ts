import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MessageTemplate } from '@prisma/client';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { translatePrismaError } from '../../common/utils/prisma-error';
import type { RequestUser } from '../../common/types/auth.types';
import {
  CreateMessageTemplateDto,
  UpdateMessageTemplateDto,
} from './dto/message-template.dto';

@Injectable()
export class MessageTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  list(): Promise<MessageTemplate[]> {
    return this.prisma.messageTemplate.findMany({ orderBy: { name: 'asc' } });
  }

  async getOrThrow(id: string): Promise<MessageTemplate> {
    const template = await this.prisma.messageTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Message template not found');
    return template;
  }

  async create(
    dto: CreateMessageTemplateDto,
    user: RequestUser,
  ): Promise<MessageTemplate> {
    const template = await this.prisma.messageTemplate.create({
      data: { name: dto.name, body: dto.body, createdByStaffId: user.id },
    });
    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'MESSAGE_TEMPLATE_CREATED',
      entityType: 'MessageTemplate',
      entityId: template.id,
      afterJson: { name: template.name },
    });
    return template;
  }

  async update(
    id: string,
    dto: UpdateMessageTemplateDto,
    user: RequestUser,
  ): Promise<MessageTemplate> {
    const existing = await this.getOrThrow(id);
    let updated: MessageTemplate;
    try {
      updated = await this.prisma.messageTemplate.update({
        where: { id },
        data: { name: dto.name, body: dto.body },
      });
    } catch (error) {
      return translatePrismaError(error, 'Message template not found');
    }
    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'MESSAGE_TEMPLATE_UPDATED',
      entityType: 'MessageTemplate',
      entityId: id,
      beforeJson: { name: existing.name, body: existing.body },
      afterJson: { name: updated.name, body: updated.body },
    });
    return updated;
  }

  async remove(id: string, user: RequestUser): Promise<void> {
    const template = await this.getOrThrow(id);
    // System templates are looked up by `key` from the absence listener and
    // the fee-reminder cron — deleting one would silently break whichever
    // automated trigger depends on it. Editing the wording is still fine
    // (see update() above); only deletion is blocked.
    if (template.key !== null) {
      throw new ConflictException(
        `"${template.name}" is a system template used by an automated trigger and can't be deleted — edit its wording instead.`,
      );
    }
    await this.prisma.messageTemplate.delete({ where: { id } });
    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'MESSAGE_TEMPLATE_DELETED',
      entityType: 'MessageTemplate',
      entityId: id,
      beforeJson: { name: template.name },
    });
  }
}
