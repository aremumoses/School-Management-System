import { InjectQueue } from '@nestjs/bullmq';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { GeneratedDocument } from '@prisma/client';
import type { Queue } from 'bullmq';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import {
  DOCUMENTS_QUEUE,
  DocumentJobData,
} from './document/document.constants';
import { GenerateDocumentDto, QueryDocumentsDto } from './dto/document.dto';

export interface DocumentRenderData {
  document: { type: GeneratedDocument['type']; generatedAt: Date };
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    dateOfBirth: Date;
    gender: string;
  };
  className: string | null;
  approvedByName: string;
  approvedAt: Date;
  school: {
    name: string;
    logoUrl: string | null;
    address: string | null;
    motto: string | null;
    registrationNumber: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    @InjectQueue(DOCUMENTS_QUEUE)
    private readonly documentsQueue: Queue<DocumentJobData>,
  ) {}

  async generate(
    dto: GenerateDocumentDto,
    user: RequestUser,
  ): Promise<GeneratedDocument> {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const document = await this.prisma.generatedDocument.create({
      data: {
        studentId: dto.studentId,
        type: dto.type,
        requestedByStaffId: user.id,
      },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'DOCUMENT_REQUESTED',
      entityType: 'GeneratedDocument',
      entityId: document.id,
      afterJson: { studentId: dto.studentId, type: dto.type },
    });

    return document;
  }

  /**
   * docs prompt §3 — only an ADMIN can approve, recording "the Admin's
   * name/timestamp" as the e-signature reference (no handwritten-signature
   * image exists to embed). The PDF is rendered *now*, not at generate()
   * time, specifically so it can correctly show who approved it — see
   * GeneratedDocument's schema comment.
   */
  async approve(id: string, user: RequestUser): Promise<GeneratedDocument> {
    const existing = await this.getRawOrThrow(id);
    if (existing.status === 'APPROVED') {
      throw new ConflictException('This document has already been approved.');
    }

    const updated = await this.prisma.generatedDocument.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedByStaffId: user.id,
        approvedAt: new Date(),
      },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'DOCUMENT_APPROVED',
      entityType: 'GeneratedDocument',
      entityId: id,
      afterJson: { type: updated.type },
    });

    await this.documentsQueue.add('generate', { documentId: id });

    return updated;
  }

  async list(
    query: QueryDocumentsDto,
    user: RequestUser,
  ): Promise<GeneratedDocument[]> {
    const where = await this.buildScopedWhere(query, user);
    if (where === 'NONE') return [];
    return this.prisma.generatedDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrThrow(id: string, user: RequestUser): Promise<GeneratedDocument> {
    const document = await this.getRawOrThrow(id);
    await this.assertAccess(document, user);
    return document;
  }

  /** Internal — no access check, for use by DocumentProcessor only. */
  async buildDocumentData(documentId: string): Promise<DocumentRenderData> {
    const document = await this.prisma.generatedDocument.findUniqueOrThrow({
      where: { id: documentId },
      include: { approvedBy: true },
    });
    if (!document.approvedBy || !document.approvedAt) {
      throw new ConflictException('Document has not been approved yet.');
    }

    const [student, enrollment, school] = await Promise.all([
      this.prisma.student.findUniqueOrThrow({
        where: { id: document.studentId },
      }),
      this.prisma.enrollment.findFirst({
        where: { studentId: document.studentId, status: 'ACTIVE' },
        include: { class: true, arm: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.school.findFirstOrThrow(),
    ]);

    return {
      document: { type: document.type, generatedAt: new Date() },
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
      },
      className: enrollment
        ? `${enrollment.class.name} ${enrollment.arm.name}`
        : null,
      approvedByName: `${document.approvedBy.firstName} ${document.approvedBy.lastName}`,
      approvedAt: document.approvedAt,
      school: {
        name: school.name,
        logoUrl: school.logoUrl,
        address: school.address,
        motto: school.motto,
        registrationNumber: school.registrationNumber,
        primaryColor: school.documentPrimaryColor ?? '#1D4ED8',
        secondaryColor: school.documentSecondaryColor ?? '#F59E0B',
      },
    };
  }

  // -------------------------------------------------------------------

  private async getRawOrThrow(id: string): Promise<GeneratedDocument> {
    const document = await this.prisma.generatedDocument.findUnique({
      where: { id },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  private async assertAccess(
    document: GeneratedDocument,
    user: RequestUser,
  ): Promise<void> {
    if (user.roles.includes('STUDENT')) {
      if (user.id !== document.studentId) {
        throw new ForbiddenException('You can only view your own documents');
      }
      if (document.status !== 'APPROVED') {
        throw new ForbiddenException('This document is not yet available');
      }
      return;
    }
    if (user.roles.includes('PARENT')) {
      const link = await this.prisma.studentGuardian.findFirst({
        where: { studentId: document.studentId, guardianId: user.id },
      });
      if (!link) {
        throw new ForbiddenException(
          "You can only view your own ward's documents",
        );
      }
      if (document.status !== 'APPROVED') {
        throw new ForbiddenException('This document is not yet available');
      }
      return;
    }
    if (user.roles.includes('ADMIN') || user.roles.includes('VICE_PRINCIPAL'))
      return;
    // Every other staff role gets "–" per docs §2 "Documents/certificates".
    throw new ForbiddenException('You do not have access to this document');
  }

  private async buildScopedWhere(
    query: QueryDocumentsDto,
    user: RequestUser,
  ): Promise<
    { studentId?: string | { in: string[] }; status?: 'APPROVED' } | 'NONE'
  > {
    if (user.roles.includes('STUDENT')) {
      return { studentId: user.id, status: 'APPROVED' };
    }
    if (user.roles.includes('PARENT')) {
      const links = await this.prisma.studentGuardian.findMany({
        where: { guardianId: user.id },
      });
      const wardIds = links.map((l) => l.studentId);
      if (wardIds.length === 0) return 'NONE';
      if (query.studentId && !wardIds.includes(query.studentId)) {
        throw new ForbiddenException(
          "You can only view your own ward's documents",
        );
      }
      return {
        studentId: query.studentId ?? { in: wardIds },
        status: 'APPROVED',
      };
    }
    if (user.roles.includes('ADMIN') || user.roles.includes('VICE_PRINCIPAL')) {
      return { studentId: query.studentId };
    }
    return 'NONE';
  }
}
