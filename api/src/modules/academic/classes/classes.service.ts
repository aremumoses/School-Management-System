import { Injectable, NotFoundException } from '@nestjs/common';
import type { Arm, Class, Staff } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { translatePrismaError } from '../../../common/utils/prisma-error';
import { CreateArmDto, UpdateArmDto } from './dto/arm.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

type ArmWithClassTeacher = Arm & {
  classTeacher: Pick<Staff, 'id' | 'firstName' | 'lastName'> | null;
};

const CLASS_TEACHER_SELECT = {
  select: { id: true, firstName: true, lastName: true },
} as const;

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async listClasses(): Promise<(Class & { arms: ArmWithClassTeacher[] })[]> {
    return this.prisma.class.findMany({
      include: {
        arms: {
          orderBy: { name: 'asc' },
          include: { classTeacher: CLASS_TEACHER_SELECT },
        },
      },
      orderBy: { level: 'asc' },
    });
  }

  async getClass(id: string): Promise<Class & { arms: ArmWithClassTeacher[] }> {
    const klass = await this.prisma.class.findUnique({
      where: { id },
      include: {
        arms: {
          orderBy: { name: 'asc' },
          include: { classTeacher: CLASS_TEACHER_SELECT },
        },
      },
    });
    if (!klass) {
      throw new NotFoundException('Class not found');
    }
    return klass;
  }

  async createClass(dto: CreateClassDto): Promise<Class> {
    try {
      return await this.prisma.class.create({ data: dto });
    } catch (error) {
      translatePrismaError(error, 'A class with this name already exists');
    }
  }

  async updateClass(id: string, dto: UpdateClassDto): Promise<Class> {
    await this.getClass(id);
    try {
      return await this.prisma.class.update({ where: { id }, data: dto });
    } catch (error) {
      translatePrismaError(error, 'A class with this name already exists');
    }
  }

  async deleteClass(id: string): Promise<void> {
    await this.getClass(id);
    try {
      await this.prisma.class.delete({ where: { id } });
    } catch (error) {
      translatePrismaError(
        error,
        'Cannot delete a class that has arms, subjects, or enrollments linked to it',
      );
    }
  }

  async addArm(classId: string, dto: CreateArmDto): Promise<Arm> {
    await this.getClass(classId);
    try {
      return await this.prisma.arm.create({
        data: { classId, name: dto.name },
      });
    } catch (error) {
      translatePrismaError(
        error,
        'An arm with this name already exists in this class',
      );
    }
  }

  async updateArm(
    armId: string,
    dto: UpdateArmDto,
  ): Promise<ArmWithClassTeacher> {
    await this.getArmOrThrow(armId);

    if (dto.classTeacherId) {
      const staff = await this.prisma.staff.findUnique({
        where: { id: dto.classTeacherId },
      });
      if (!staff) {
        throw new NotFoundException('Staff member not found');
      }
    }

    try {
      return await this.prisma.arm.update({
        where: { id: armId },
        data: dto,
        include: { classTeacher: CLASS_TEACHER_SELECT },
      });
    } catch (error) {
      translatePrismaError(
        error,
        'An arm with this name already exists in this class',
      );
    }
  }

  async deleteArm(armId: string): Promise<void> {
    await this.getArmOrThrow(armId);
    try {
      await this.prisma.arm.delete({ where: { id: armId } });
    } catch (error) {
      translatePrismaError(
        error,
        'Cannot delete an arm that has enrollments linked to it',
      );
    }
  }

  private async getArmOrThrow(armId: string): Promise<Arm> {
    const arm = await this.prisma.arm.findUnique({ where: { id: armId } });
    if (!arm) {
      throw new NotFoundException('Arm not found');
    }
    return arm;
  }
}
