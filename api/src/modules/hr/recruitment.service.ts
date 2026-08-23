import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Candidate, JobVacancy } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { StaffService } from '../staff/staff.service';
import {
  ApplyToVacancyDto,
  ConvertCandidateDto,
  CreateVacancyDto,
  UpdateCandidateStageDto,
  UpdateVacancyStatusDto,
} from './dto/recruitment.dto';

type VacancyWithCandidateCount = JobVacancy & {
  _count: { candidates: number };
};

@Injectable()
export class RecruitmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffService: StaffService,
  ) {}

  createVacancy(dto: CreateVacancyDto, user: RequestUser): Promise<JobVacancy> {
    return this.prisma.jobVacancy.create({
      data: {
        title: dto.title,
        description: dto.description,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        postedByStaffId: user.id,
      },
    });
  }

  listVacancies(): Promise<VacancyWithCandidateCount[]> {
    return this.prisma.jobVacancy.findMany({
      include: { _count: { select: { candidates: true } } },
      orderBy: { postedAt: 'desc' },
    });
  }

  async getVacancy(
    id: string,
  ): Promise<JobVacancy & { candidates: Candidate[] }> {
    const vacancy = await this.prisma.jobVacancy.findUnique({
      where: { id },
      include: { candidates: { orderBy: { appliedAt: 'desc' } } },
    });
    if (!vacancy) throw new NotFoundException('Vacancy not found');
    return vacancy;
  }

  async updateVacancyStatus(
    id: string,
    dto: UpdateVacancyStatusDto,
  ): Promise<JobVacancy> {
    const vacancy = await this.prisma.jobVacancy.findUnique({ where: { id } });
    if (!vacancy) throw new NotFoundException('Vacancy not found');
    return this.prisma.jobVacancy.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  // Public, unauthenticated — a candidate has no account yet (same
  // reasoning as Stage 12's admissions apply endpoint).
  async apply(vacancyId: string, dto: ApplyToVacancyDto): Promise<Candidate> {
    const vacancy = await this.prisma.jobVacancy.findUnique({
      where: { id: vacancyId },
    });
    if (!vacancy) throw new NotFoundException('Vacancy not found');
    if (vacancy.status === 'CLOSED') {
      throw new BadRequestException(
        'This vacancy is no longer accepting applications',
      );
    }

    return this.prisma.candidate.create({
      data: {
        vacancyId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        resumeUrl: dto.resumeUrl,
      },
    });
  }

  listCandidates(vacancyId?: string): Promise<Candidate[]> {
    return this.prisma.candidate.findMany({
      where: { ...(vacancyId && { vacancyId }) },
      include: { vacancy: { select: { title: true } } },
      orderBy: { appliedAt: 'desc' },
    });
  }

  private async getCandidateOrThrow(id: string): Promise<Candidate> {
    const candidate = await this.prisma.candidate.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  async updateCandidateStage(
    id: string,
    dto: UpdateCandidateStageDto,
  ): Promise<Candidate> {
    const candidate = await this.getCandidateOrThrow(id);
    if (candidate.convertedStaffId) {
      throw new ConflictException(
        'This candidate has already been converted to a staff member and cannot change stage.',
      );
    }
    return this.prisma.candidate.update({
      where: { id },
      data: { stage: dto.stage },
    });
  }

  /** Reuses StaffService.createStaff directly — including its temporary-password convention — rather than duplicating staff-creation logic. */
  async convertToStaff(
    id: string,
    dto: ConvertCandidateDto,
  ): Promise<{ staffId: string; temporaryPassword?: string }> {
    const candidate = await this.getCandidateOrThrow(id);
    if (candidate.convertedStaffId) {
      throw new ConflictException('This candidate has already been converted.');
    }
    if (candidate.stage !== 'HIRED') {
      throw new ForbiddenException(
        'Only HIRED candidates can be converted to a staff member.',
      );
    }

    const [firstName, ...rest] = candidate.name.trim().split(/\s+/);
    const lastName = rest.length > 0 ? rest.join(' ') : firstName;

    const staff = await this.staffService.createStaff({
      firstName,
      lastName,
      email: candidate.email,
      phone: candidate.phone ?? undefined,
      roles: dto.roles,
    });

    await this.prisma.candidate.update({
      where: { id },
      data: { convertedStaffId: staff.id },
    });

    return { staffId: staff.id, temporaryPassword: staff.temporaryPassword };
  }
}
