import { Injectable, NotFoundException } from '@nestjs/common';
import type { Guardian } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertEmailAvailableAcrossUserTypes } from '../../common/utils/assert-email-available';
import { generateTempPassword } from '../../common/utils/generate-temp-password';
import { translatePrismaError } from '../../common/utils/prisma-error';
import { CreateGuardianDto } from './dto/create-guardian.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class GuardiansService {
  constructor(private readonly prisma: PrismaService) {}

  async listGuardians(): Promise<Guardian[]> {
    return this.prisma.guardian.findMany({
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async getGuardian(id: string): Promise<Guardian> {
    const guardian = await this.prisma.guardian.findUnique({ where: { id } });
    if (!guardian) {
      throw new NotFoundException('Guardian not found');
    }
    return guardian;
  }

  /** Returns the temp password once if one wasn't supplied — mirrors staff.service.ts's createStaff. */
  async createGuardian(
    dto: CreateGuardianDto,
  ): Promise<Guardian & { temporaryPassword?: string }> {
    await assertEmailAvailableAcrossUserTypes(
      this.prisma,
      dto.email,
      'GUARDIAN',
    );

    const temporaryPassword = dto.password ?? generateTempPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

    try {
      const guardian = await this.prisma.guardian.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
        },
      });
      return { ...guardian, ...(dto.password ? {} : { temporaryPassword }) };
    } catch (error) {
      translatePrismaError(error, 'A guardian with this email already exists');
    }
  }

  /**
   * Issues a brand-new temporary password (e.g. the original was lost, or
   * this is a "resend invite") — returned once, never persisted in
   * plaintext. Also revokes any active refresh tokens, the same as
   * staff.service.ts's deactivate(): a password reset that leaves an
   * already-issued session usable defeats the point of resetting it.
   */
  async resetPassword(id: string): Promise<{ temporaryPassword: string }> {
    await this.getGuardian(id);
    const temporaryPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.guardian.update({ where: { id }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { guardianId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { temporaryPassword };
  }
}
