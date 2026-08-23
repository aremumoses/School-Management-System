import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as not requiring authentication at all — used sparingly
 * (health check, login, refresh). Everything else is denied by default;
 * see RolesGuard.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
