import { SetMetadata } from '@nestjs/common';
import type { AppRole } from '../types/auth.types';

export const ROLES_KEY = 'roles';

/**
 * `@Roles('ADMIN', 'BURSAR')` — caller must hold at least one of the listed
 * roles (matches the permission matrix in docs/03-roles-and-permissions.md).
 * `@Roles()` with no arguments means "any authenticated user, any role."
 * A route with neither this nor `@Public()` is denied by default — see
 * RolesGuard.
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
