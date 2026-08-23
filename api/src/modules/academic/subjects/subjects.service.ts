import { Injectable, NotFoundException } from '@nestjs/common';
import type { Class, ClassSubject, Subject } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { translatePrismaError } from '../../../common/utils/prisma-error';
import { MapSubjectToClassDto } from './dto/map-subject-class.dto';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';

type SubjectWithClasses = Subject & {
  classSubjects: (ClassSubject & { class: Class })[];
};

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSubjects(): Promise<SubjectWithClasses[]> {
    return this.prisma.subject.findMany({
      include: { classSubjects: { include: { class: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getSubject(id: string): Promise<SubjectWithClasses> {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: { classSubjects: { include: { class: true } } },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    return subject;
  }

  async createSubject(dto: CreateSubjectDto): Promise<Subject> {
    try {
      return await this.prisma.subject.create({ data: dto });
    } catch (error) {
      translatePrismaError(
        error,
        'A subject with this name or code already exists',
      );
    }
  }

  async updateSubject(id: string, dto: UpdateSubjectDto): Promise<Subject> {
    await this.getSubject(id);
    try {
      return await this.prisma.subject.update({ where: { id }, data: dto });
    } catch (error) {
      translatePrismaError(
        error,
        'A subject with this name or code already exists',
      );
    }
  }

  async deleteSubject(id: string): Promise<void> {
    await this.getSubject(id);
    try {
      await this.prisma.subject.delete({ where: { id } });
    } catch (error) {
      translatePrismaError(
        error,
        'Cannot delete a subject that is mapped to a class or has scores linked to it',
      );
    }
  }

  /** Validates the subject can't be mapped to the same class level twice (DB-unique-constraint enforced, translated to a clean 409). */
  async mapToClass(
    subjectId: string,
    dto: MapSubjectToClassDto,
  ): Promise<ClassSubject> {
    await this.getSubject(subjectId);

    const klass = await this.prisma.class.findUnique({
      where: { id: dto.classId },
    });
    if (!klass) {
      throw new NotFoundException('Class not found');
    }

    try {
      return await this.prisma.classSubject.create({
        data: { subjectId, classId: dto.classId },
      });
    } catch (error) {
      translatePrismaError(
        error,
        'This subject is already mapped to this class',
      );
    }
  }

  async unmapFromClass(classSubjectId: string): Promise<void> {
    const mapping = await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
    });
    if (!mapping) {
      throw new NotFoundException('Class-subject mapping not found');
    }
    try {
      await this.prisma.classSubject.delete({ where: { id: classSubjectId } });
    } catch (error) {
      translatePrismaError(
        error,
        'Cannot remove a mapping that already has teacher assignments or scores linked to it',
      );
    }
  }
}
