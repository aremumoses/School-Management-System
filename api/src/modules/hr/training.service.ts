import { Injectable, NotFoundException } from '@nestjs/common';
import type { TrainingRecord } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import type { RequestUser } from '../../common/types/auth.types';
import { CreateTrainingRecordDto } from './dto/training.dto';

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(
    dto: CreateTrainingRecordDto,
    user: RequestUser,
    file: Express.Multer.File | undefined,
  ): Promise<TrainingRecord> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: dto.staffId },
    });
    if (!staff) throw new NotFoundException('Staff member not found');

    let certificateUrl: string | undefined;
    if (file) {
      const { url } = await this.storage.upload(
        {
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
        },
        'training-certificates',
      );
      certificateUrl = url;
    }

    return this.prisma.trainingRecord.create({
      data: {
        staffId: dto.staffId,
        title: dto.title,
        provider: dto.provider,
        completedDate: new Date(dto.completedDate),
        hoursOrCredits: dto.hoursOrCredits,
        certificateUrl,
        loggedByStaffId: user.id,
      },
    });
  }

  getHistory(staffId: string) {
    return this.prisma.trainingRecord.findMany({
      where: { staffId },
      orderBy: { completedDate: 'desc' },
    });
  }
}
