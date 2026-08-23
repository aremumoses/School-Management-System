import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Staff, StaffRole, TeacherAssignment } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertEmailAvailableAcrossUserTypes } from '../../common/utils/assert-email-available';
import { generateTempPassword } from '../../common/utils/generate-temp-password';
import { translatePrismaError } from '../../common/utils/prisma-error';
import type { RequestUser } from '../../common/types/auth.types';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { CreateTeacherAssignmentDto } from './dto/create-teacher-assignment.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

type StaffWithRoles = Staff & { roles: StaffRole[] };

const BCRYPT_ROUNDS = 10;

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async listStaff(): Promise<StaffWithRoles[]> {
    // passwordHash is globally omitted by PrismaService — see its comment —
    // so there's nothing extra to strip here.
    return this.prisma.staff.findMany({
      include: { roles: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async getStaff(id: string): Promise<StaffWithRoles> {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: { roles: true },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }
    return staff;
  }

  /** Returns the temp password once if one wasn't supplied — never persisted in plaintext, never returned again after this call. */
  async createStaff(
    dto: CreateStaffDto,
  ): Promise<StaffWithRoles & { temporaryPassword?: string }> {
    await assertEmailAvailableAcrossUserTypes(this.prisma, dto.email, 'STAFF');

    const temporaryPassword = dto.password ?? generateTempPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

    try {
      const staff = await this.prisma.staff.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          employmentDate: dto.employmentDate
            ? new Date(dto.employmentDate)
            : undefined,
          passwordHash,
          roles: dto.roles
            ? { create: dto.roles.map((role) => ({ role })) }
            : undefined,
        },
        include: { roles: true },
      });
      return { ...staff, ...(dto.password ? {} : { temporaryPassword }) };
    } catch (error) {
      translatePrismaError(
        error,
        'A staff member with this email already exists',
      );
    }
  }

  async updateStaff(
    id: string,
    dto: UpdateStaffDto,
    currentUserId: string,
  ): Promise<StaffWithRoles> {
    await this.getStaff(id);

    if (dto.isActive === false) {
      if (id === currentUserId) {
        throw new BadRequestException(
          'You cannot deactivate your own account — ask another admin to do this.',
        );
      }
      return this.deactivate(id, dto);
    }

    if (dto.email !== undefined) {
      await assertEmailAvailableAcrossUserTypes(
        this.prisma,
        dto.email,
        'STAFF',
      );
    }

    try {
      return await this.prisma.staff.update({
        where: { id },
        data: {
          ...(dto.firstName !== undefined && { firstName: dto.firstName }),
          ...(dto.lastName !== undefined && { lastName: dto.lastName }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.employmentDate !== undefined && {
            employmentDate: new Date(dto.employmentDate),
          }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
        include: { roles: true },
      });
    } catch (error) {
      translatePrismaError(
        error,
        'A staff member with this email already exists',
      );
    }
  }

  /** Deactivating a staff member also revokes their active sessions immediately — see docs/18-technical-architecture.md §4. */
  private async deactivate(
    id: string,
    dto: UpdateStaffDto,
  ): Promise<StaffWithRoles> {
    return this.prisma.$transaction(async (tx) => {
      const staff = await tx.staff.update({
        where: { id },
        data: {
          isActive: false,
          ...(dto.firstName !== undefined && { firstName: dto.firstName }),
          ...(dto.lastName !== undefined && { lastName: dto.lastName }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
        },
        include: { roles: true },
      });
      await tx.refreshToken.updateMany({
        where: { staffId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return staff;
    });
  }

  async assignRole(staffId: string, dto: AssignRoleDto): Promise<StaffRole> {
    await this.getStaff(staffId);
    try {
      return await this.prisma.staffRole.create({
        data: { staffId, role: dto.role },
      });
    } catch (error) {
      translatePrismaError(error, 'This staff member already holds that role');
    }
  }

  async removeRole(staffId: string, staffRoleId: string): Promise<void> {
    const staffRole = await this.prisma.staffRole.findUnique({
      where: { id: staffRoleId },
    });
    if (!staffRole || staffRole.staffId !== staffId) {
      throw new NotFoundException(
        'Role assignment not found for this staff member',
      );
    }

    // Never let the school end up with zero Admins through this endpoint —
    // that's an irrecoverable lockout (nobody left who can grant the role
    // back) short of direct database intervention.
    if (staffRole.role === 'ADMIN') {
      const adminCount = await this.prisma.staffRole.count({
        where: { role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last Administrator — assign ADMIN to another staff member first.',
        );
      }
    }

    await this.prisma.staffRole.delete({ where: { id: staffRoleId } });
  }

  /**
   * Self-or-privileged: a teacher needs their own assignments to know
   * which classes/subjects they can act on (e.g. attendance.service.ts's
   * marking-context picker on the frontend) — ADMIN/HR_OFFICER can still
   * view anyone's, matching docs/03-roles-and-permissions.md §2's "Staff/HR
   * records" row (HR_OFFICER: F).
   */
  async listTeachingAssignments(
    staffId: string,
    user: RequestUser,
  ): Promise<TeacherAssignment[]> {
    const isSelfOrPrivileged =
      user.id === staffId ||
      user.roles.includes('ADMIN') ||
      user.roles.includes('HR_OFFICER');
    if (!isSelfOrPrivileged) {
      throw new ForbiddenException(
        'You can only view your own teaching assignments',
      );
    }
    await this.getStaff(staffId);
    return this.prisma.teacherAssignment.findMany({
      where: { staffId },
      include: {
        classSubject: { include: { class: true, subject: true } },
        term: true,
      },
    });
  }

  async addTeachingAssignment(
    staffId: string,
    dto: CreateTeacherAssignmentDto,
  ): Promise<TeacherAssignment> {
    await this.getStaff(staffId);

    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: dto.classSubjectId },
    });
    if (!classSubject) {
      throw new BadRequestException(
        'classSubjectId does not refer to an existing mapping',
      );
    }
    const term = await this.prisma.term.findUnique({
      where: { id: dto.termId },
    });
    if (!term) {
      throw new BadRequestException(
        'termId does not refer to an existing term',
      );
    }

    try {
      return await this.prisma.teacherAssignment.create({
        data: {
          staffId,
          classSubjectId: dto.classSubjectId,
          termId: dto.termId,
          scoreEntryDeadline: dto.scoreEntryDeadline
            ? new Date(dto.scoreEntryDeadline)
            : undefined,
        },
      });
    } catch (error) {
      translatePrismaError(
        error,
        'This staff member is already assigned to teach this class+subject for this term',
      );
    }
  }

  async updateScoreEntryDeadline(
    assignmentId: string,
    dto: { scoreEntryDeadline?: string | null },
  ): Promise<TeacherAssignment> {
    const assignment = await this.prisma.teacherAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('Teaching assignment not found');
    }
    return this.prisma.teacherAssignment.update({
      where: { id: assignmentId },
      data: {
        scoreEntryDeadline: dto.scoreEntryDeadline
          ? new Date(dto.scoreEntryDeadline)
          : null,
      },
    });
  }

  async removeTeachingAssignment(assignmentId: string): Promise<void> {
    const assignment = await this.prisma.teacherAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('Teaching assignment not found');
    }
    await this.prisma.teacherAssignment.delete({ where: { id: assignmentId } });
  }
}
