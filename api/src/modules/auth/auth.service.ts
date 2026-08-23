import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { EnvConfig } from '../../common/config/env.validation';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  AccessTokenPayload,
  AppRole,
  RefreshTokenPayload,
} from '../../common/types/auth.types';
import { parseDurationToMs } from '../../common/utils/parse-duration';

export interface AuthenticatedUser {
  id: string;
  userType: UserType;
  roles: AppRole[];
  email: string;
  firstName: string;
  lastName: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  /**
   * Checks email+password against Staff, then Guardian, then Student — the
   * three tables a login email could belong to (see
   * docs/03-roles-and-permissions.md §4). Returns null rather than throwing
   * so the caller (LocalStrategy) can produce one generic "invalid
   * credentials" error regardless of which table almost-matched.
   */
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    // Defensive: Nest runs Guards (which is where passport-local extracts
    // these from the raw request body) before Pipes/DTO validation, so a
    // malformed request can reach here with a missing/non-string field —
    // handle that with a clean null instead of letting Prisma throw on an
    // undefined `where` value.
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email ||
      !password
    ) {
      return null;
    }

    // This module is the one deliberate exception to PrismaService's global
    // passwordHash omit (see common/prisma/prisma.service.ts) — explicitly
    // opted back in here, nowhere else.
    const staff = await this.prisma.staff.findUnique({
      where: { email },
      include: { roles: true },
      omit: { passwordHash: false },
    });
    if (
      staff?.isActive &&
      (await bcrypt.compare(password, staff.passwordHash))
    ) {
      return {
        id: staff.id,
        userType: UserType.STAFF,
        roles: staff.roles.map((r) => r.role),
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
      };
    }

    const guardian = await this.prisma.guardian.findUnique({
      where: { email },
      omit: { passwordHash: false },
    });
    if (
      guardian?.isActive &&
      (await bcrypt.compare(password, guardian.passwordHash))
    ) {
      return {
        id: guardian.id,
        userType: UserType.GUARDIAN,
        roles: ['PARENT'],
        email: guardian.email,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
      };
    }

    const student = await this.prisma.student.findUnique({
      where: { email },
      omit: { passwordHash: false },
    });
    if (
      student?.isActive &&
      student.passwordHash &&
      (await bcrypt.compare(password, student.passwordHash))
    ) {
      return {
        id: student.id,
        userType: UserType.STUDENT,
        roles: ['STUDENT'],
        email: student.email!,
        firstName: student.firstName,
        lastName: student.lastName,
      };
    }

    return null;
  }

  async login(
    user: AuthenticatedUser,
  ): Promise<TokenPair & { user: AuthenticatedUser }> {
    const tokens = await this.issueTokenPair(
      user.id,
      user.userType,
      user.roles,
    );
    await this.writeAuditLog({
      actorId: user.id,
      actorType: user.userType,
      actorRole: user.roles.join(','),
      action: 'LOGIN',
      entityId: user.id,
    });
    return { ...tokens, user };
  }

  /** Refresh-token rotation: the presented token is revoked and a brand new pair is issued, so a leaked token can't be replayed after one use. */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = this.verifyRefreshToken(refreshToken);

    const tokenRow = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });
    if (!tokenRow || tokenRow.revokedAt || tokenRow.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Refresh token is invalid or has been revoked',
      );
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenRow.id },
      data: { revokedAt: new Date() },
    });

    const roles = await this.rolesFor(payload.userType, payload.sub);
    const tokens = await this.issueTokenPair(
      payload.sub,
      payload.userType,
      roles,
    );
    await this.writeAuditLog({
      actorId: payload.sub,
      actorType: payload.userType,
      action: 'REFRESH_TOKEN_ROTATED',
      entityId: payload.sub,
    });
    return tokens;
  }

  /** Idempotent — revoking an already-invalid/unknown token is not an error. */
  async logout(refreshToken: string): Promise<void> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.verifyRefreshToken(refreshToken);
    } catch {
      return;
    }
    await this.prisma.refreshToken.updateMany({
      where: { id: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.writeAuditLog({
      actorId: payload.sub,
      actorType: payload.userType,
      action: 'LOGOUT',
      entityId: payload.sub,
    });
  }

  private verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token is invalid or has expired',
      );
    }
  }

  private async rolesFor(userType: UserType, id: string): Promise<AppRole[]> {
    if (userType === UserType.STAFF) {
      const roles = await this.prisma.staffRole.findMany({
        where: { staffId: id },
      });
      return roles.map((r) => r.role);
    }
    if (userType === UserType.GUARDIAN) {
      return ['PARENT'];
    }
    if (userType === UserType.STUDENT) {
      return ['STUDENT'];
    }
    return [];
  }

  private async issueTokenPair(
    userId: string,
    userType: UserType,
    roles: AppRole[],
  ): Promise<TokenPair> {
    // Pass expiresIn as a plain number of seconds rather than the raw env
    // string — jsonwebtoken's types want a branded `ms`-package string
    // literal for the string form, which a runtime-validated-but-not-TS-
    // narrowed env value can't satisfy without an unsafe cast.
    const accessExpiresInMs = parseDurationToMs(
      this.configService.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
    );
    const accessPayload: AccessTokenPayload = { sub: userId, userType, roles };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: accessExpiresInMs / 1000,
    });

    const refreshExpiresInMs = parseDurationToMs(
      this.configService.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
    );
    const expiresAt = new Date(Date.now() + refreshExpiresInMs);

    const tokenRow = await this.prisma.refreshToken.create({
      data: {
        userType,
        expiresAt,
        ...(userType === UserType.STAFF && { staffId: userId }),
        ...(userType === UserType.GUARDIAN && { guardianId: userId }),
        ...(userType === UserType.STUDENT && { studentId: userId }),
      },
    });

    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      userType,
      jti: tokenRow.id,
    };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: refreshExpiresInMs / 1000,
    });

    return { accessToken, refreshToken };
  }

  private async writeAuditLog(entry: {
    actorId: string;
    actorType: UserType;
    actorRole?: string;
    action: string;
    entityId: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        actorType: entry.actorType,
        actorRole: entry.actorRole,
        action: entry.action,
        entityType: entry.actorType,
        entityId: entry.entityId,
      },
    });
  }
}
