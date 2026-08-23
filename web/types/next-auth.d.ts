import type { DefaultSession, DefaultUser } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

/**
 * Mirrors the backend's AppRole (see api/src/common/types/auth.types.ts):
 * Prisma's staff Role enum values, plus the two synthetic roles for the
 * non-staff user types. Kept as a plain union here since the frontend has
 * no Prisma client (it never talks to the database directly — see
 * docs/18-technical-architecture.md §3).
 */
export type AppRole =
  | 'ADMIN'
  | 'VICE_PRINCIPAL'
  | 'HOD'
  | 'CLASS_TEACHER'
  | 'SUBJECT_TEACHER'
  | 'EXAM_OFFICER'
  | 'BURSAR'
  | 'LIBRARIAN'
  | 'HOSTEL_WARDEN'
  | 'TRANSPORT_OFFICER'
  | 'HR_OFFICER'
  | 'FRONT_DESK'
  | 'STUDENT'
  | 'PARENT';

export type UserType = 'STAFF' | 'GUARDIAN' | 'STUDENT' | 'SYSTEM';

declare module 'next-auth' {
  interface User extends DefaultUser {
    userType: UserType;
    roles: AppRole[];
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      userType: UserType;
      roles: AppRole[];
    } & DefaultSession['user'];
    accessToken: string;
    error?: 'RefreshAccessTokenError';
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    userType: UserType;
    roles: AppRole[];
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number;
    error?: 'RefreshAccessTokenError';
  }
}
