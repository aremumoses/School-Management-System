import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  StaffDocument,
  StaffDocumentType,
  StaffEmploymentRecord,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { UpsertEmploymentRecordDto } from './dto/staff-employment.dto';

@Injectable()
export class StaffEmploymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async assertStaffExists(staffId: string): Promise<void> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });
    if (!staff) throw new NotFoundException('Staff member not found');
  }

  async getEmploymentRecord(
    staffId: string,
  ): Promise<StaffEmploymentRecord | null> {
    await this.assertStaffExists(staffId);
    return this.prisma.staffEmploymentRecord.findUnique({ where: { staffId } });
  }

  listRosterForExport() {
    return this.prisma.staff.findMany({
      include: { roles: true, employmentRecord: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  /** One record per staff member — upsert rather than separate create/update endpoints, since HR fills this in incrementally. */
  async upsertEmploymentRecord(
    staffId: string,
    dto: UpsertEmploymentRecordDto,
  ): Promise<StaffEmploymentRecord> {
    await this.assertStaffExists(staffId);
    if (dto.salaryStructureId) {
      const structure = await this.prisma.salaryStructure.findUnique({
        where: { id: dto.salaryStructureId },
      });
      if (!structure) {
        throw new BadRequestException('Salary structure not found');
      }
    }

    const data = {
      ...(dto.nextOfKinName !== undefined && {
        nextOfKinName: dto.nextOfKinName,
      }),
      ...(dto.nextOfKinPhone !== undefined && {
        nextOfKinPhone: dto.nextOfKinPhone,
      }),
      ...(dto.nextOfKinRelationship !== undefined && {
        nextOfKinRelationship: dto.nextOfKinRelationship,
      }),
      ...(dto.qualifications !== undefined && {
        qualifications: dto.qualifications,
      }),
      ...(dto.department !== undefined && { department: dto.department }),
      ...(dto.bankName !== undefined && { bankName: dto.bankName }),
      ...(dto.bankAccountNumber !== undefined && {
        bankAccountNumber: dto.bankAccountNumber,
      }),
      ...(dto.bankAccountName !== undefined && {
        bankAccountName: dto.bankAccountName,
      }),
      ...(dto.salaryStructureId !== undefined && {
        salaryStructureId: dto.salaryStructureId,
      }),
    };

    return this.prisma.staffEmploymentRecord.upsert({
      where: { staffId },
      update: data,
      create: { staffId, ...data },
    });
  }

  async listDocuments(staffId: string): Promise<StaffDocument[]> {
    await this.assertStaffExists(staffId);
    return this.prisma.staffDocument.findMany({
      where: { staffId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async uploadDocument(
    staffId: string,
    type: StaffDocumentType,
    expiryDate: string | undefined,
    file: Express.Multer.File | undefined,
  ): Promise<StaffDocument> {
    if (!file) throw new BadRequestException('No file uploaded');
    await this.assertStaffExists(staffId);

    const { url } = await this.storage.upload(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
      'staff-documents',
    );

    return this.prisma.staffDocument.create({
      data: {
        staffId,
        type,
        fileName: file.originalname,
        fileUrl: url,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });
  }

  async deleteDocument(id: string): Promise<void> {
    const doc = await this.prisma.staffDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.prisma.staffDocument.delete({ where: { id } });
  }
}
