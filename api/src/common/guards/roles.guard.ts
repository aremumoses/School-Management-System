import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AppRole, RequestUser } from '../types/auth.types';

/**
 * Global authorization guard. Three-tier policy, checked in this order:
 *   1. `@Public()` -> allow, no auth needed at all.
 *   2. No `@Roles()` and not `@Public()` -> deny (403). Fails closed by
 *      default so a route a developer forgot to annotate doesn't silently
 *      become reachable by any authenticated user.
 *   3. `@Roles()` present:
 *      - empty array (`@Roles()` with no args) -> any authenticated user.
 *      - non-empty -> caller's roles must intersect the required list.
 *
 * Runs after JwtAuthGuard, which populates `req.user` for non-public routes.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<
      AppRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (requiredRoles === undefined) {
      throw new ForbiddenException(
        'This route has no access policy configured',
      );
    }

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;
    if (!user || !Array.isArray(user.roles)) {
      return false;
    }

    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
