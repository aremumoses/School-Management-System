import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { School } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import type { UpdateGradingScaleDto } from './dto/update-grading-scale.dto';
import type { UpdateSchoolDto } from './dto/update-school.dto';

export interface UploadedLogoFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const WEIGHT_SUM_TOLERANCE = 0.01;

@Injectable()
export class SchoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * There is exactly one School row in this single-school build (see
   * docs/18-technical-architecture.md §2) — created by the seed script, not
   * by this module, since there's never a "create another school" action.
   */
  async getSchool(): Promise<School> {
    const school = await this.prisma.school.findFirst();
    if (!school) {
      throw new NotFoundException(
        'School profile has not been set up yet — run the seed script first',
      );
    }
    return school;
  }

  async updateProfile(dto: UpdateSchoolDto): Promise<School> {
    const school = await this.getSchool();
    return this.prisma.school.update({ where: { id: school.id }, data: dto });
  }

  async uploadLogo(file: UploadedLogoFile | undefined): Promise<School> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Logo must be an image file');
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      throw new BadRequestException('Logo must be 5MB or smaller');
    }

    const school = await this.getSchool();
    const { url } = await this.storage.upload(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
      'school-logos',
    );

    return this.prisma.school.update({
      where: { id: school.id },
      data: { logoUrl: url },
    });
  }

  async updateGradingScale(dto: UpdateGradingScaleDto): Promise<School> {
    const totalWeight = dto.caWeighting.reduce(
      (sum, entry) => sum + entry.weight,
      0,
    );
    if (Math.abs(totalWeight - 100) > WEIGHT_SUM_TOLERANCE) {
      throw new BadRequestException(
        `CA/exam weighting must sum to 100, got ${totalWeight}`,
      );
    }

    for (const entry of dto.gradingScale) {
      if (entry.min > entry.max) {
        throw new BadRequestException(
          `Grading scale entry "${entry.grade}" has min (${entry.min}) greater than max (${entry.max})`,
        );
      }
    }

    const school = await this.getSchool();
    // Map to plain objects (not class-validator instances) before handing
    // to Prisma's Json field, which expects plain JSON-serializable values.
    return this.prisma.school.update({
      where: { id: school.id },
      data: {
        gradingScale: dto.gradingScale.map((e) => ({
          min: e.min,
          max: e.max,
          grade: e.grade,
          remark: e.remark,
        })),
        caWeighting: dto.caWeighting.map((e) => ({
          name: e.name,
          weight: e.weight,
        })),
      },
    });
  }

  async updateEnabledModules(modules: string[]) {
    const school = await this.getSchool();
    return this.prisma.school.update({
      where: { id: school.id },
      data: { enabledModules: modules },
    });
  }
}
