import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Resource } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import type { RequestUser } from '../../common/types/auth.types';
import { CreateResourceDto, QueryResourcesDto } from './dto/resource.dto';

// Roles whose GET sees everything (oversight) and whose DELETE isn't
// limited to their own uploads — same unscoped set as Lesson Notes.
const UNSCOPED_ROLES: RequestUser['roles'] = ['ADMIN', 'VICE_PRINCIPAL', 'HOD'];

const RESOURCE_INCLUDE = {
  subject: { select: { id: true, name: true } },
  class: { select: { id: true, name: true } },
  uploadedBy: { select: { firstName: true, lastName: true } },
} as const;

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private isUnscoped(user: RequestUser): boolean {
    return user.roles.some((role) => UNSCOPED_ROLES.includes(role));
  }

  async create(dto: CreateResourceDto, user: RequestUser): Promise<Resource> {
    // The subject must actually be on this class's curriculum, and the
    // caller must teach it — the same TeacherAssignment ownership check as
    // Lesson Notes/Assignments, resolved via the (classId, subjectId) pair.
    const classSubject = await this.prisma.classSubject.findUnique({
      where: {
        classId_subjectId: { classId: dto.classId, subjectId: dto.subjectId },
      },
    });
    if (!classSubject) {
      throw new BadRequestException(
        "This subject is not on that class's curriculum",
      );
    }
    const currentTerm = await this.prisma.term.findFirst({
      where: { isCurrent: true },
    });
    if (!currentTerm) throw new BadRequestException('No current term is set');
    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: {
        staffId: user.id,
        classSubjectId: classSubject.id,
        termId: currentTerm.id,
      },
    });
    if (!assignment) {
      throw new ForbiddenException(
        'You are not assigned to teach this class/subject this term',
      );
    }

    if (dto.type === 'VIDEO_LINK' && !dto.externalUrl) {
      throw new BadRequestException(
        'A VIDEO_LINK resource needs an externalUrl',
      );
    }

    return this.prisma.resource.create({
      data: {
        title: dto.title,
        topic: dto.topic?.trim() || null,
        type: dto.type,
        subjectId: dto.subjectId,
        classId: dto.classId,
        externalUrl: dto.externalUrl ?? null,
        uploadedByStaffId: user.id,
      },
      include: RESOURCE_INCLUDE,
    });
  }

  /**
   * Teachers: their own uploads. Students: their current class's catalog
   * (across all subjects). Unscoped staff: everything. Filters apply on
   * top of whichever scope.
   */
  async list(query: QueryResourcesDto, user: RequestUser) {
    let scope: Prisma.ResourceWhereInput = {};
    if (user.userType === 'STUDENT') {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId: user.id, status: 'ACTIVE' },
      });
      if (!enrollment) return [];
      scope = { classId: enrollment.classId };
    } else if (user.userType === 'GUARDIAN') {
      // Parents browse the same catalog as their wards.
      const links = await this.prisma.studentGuardian.findMany({
        where: { guardianId: user.id },
        select: { studentId: true },
      });
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          studentId: { in: links.map((l) => l.studentId) },
          status: 'ACTIVE',
        },
        select: { classId: true },
      });
      const classIds = [...new Set(enrollments.map((e) => e.classId))];
      if (classIds.length === 0) return [];
      scope = { classId: { in: classIds } };
    } else if (!this.isUnscoped(user)) {
      scope = { uploadedByStaffId: user.id };
    }

    return this.prisma.resource.findMany({
      where: {
        ...scope,
        ...(query.classId ? { classId: query.classId } : {}),
        ...(query.subjectId ? { subjectId: query.subjectId } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: 'insensitive' } },
                { topic: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: RESOURCE_INCLUDE,
    });
  }

  async uploadFile(
    id: string,
    file: Express.Multer.File | undefined,
    user: RequestUser,
  ): Promise<Resource> {
    if (!file) throw new BadRequestException('No file uploaded');
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException('Resource not found');
    if (resource.uploadedByStaffId !== user.id) {
      throw new ForbiddenException(
        'You can only attach files to your own resources',
      );
    }

    const { url } = await this.storage.upload(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
      'resources',
    );

    return this.prisma.resource.update({
      where: { id },
      data: { fileUrl: url },
      include: RESOURCE_INCLUDE,
    });
  }

  async delete(id: string, user: RequestUser): Promise<void> {
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException('Resource not found');
    if (resource.uploadedByStaffId !== user.id && !this.isUnscoped(user)) {
      throw new ForbiddenException('You can only delete your own resources');
    }
    await this.prisma.resource.delete({ where: { id } });
  }
}
