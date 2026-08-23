import { Role, UserType } from '@prisma/client';

/**
 * Everything `@Roles(...)` can be checked against. Staff roles come from
 * the Prisma `Role` enum; Student/Guardian aren't "roles" in the data model
 * (see schema.prisma's UserType comment) but behave like one for guard
 * purposes, so they're added here as the two extra string literals.
 */
export type AppRole = Role | 'STUDENT' | 'PARENT';

export interface AccessTokenPayload {
  sub: string;
  userType: UserType;
  roles: AppRole[];
}

export interface RefreshTokenPayload {
  sub: string;
  userType: UserType;
  jti: string;
}

/** What ends up on `req.user` after JwtStrategy validates an access token. */
export interface RequestUser {
  id: string;
  userType: UserType;
  roles: AppRole[];
}
