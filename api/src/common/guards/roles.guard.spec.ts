import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function createMockContext(user?: { roles: string[] }): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows a route marked @Public()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    expect(guard.canActivate(createMockContext())).toBe(true);
  });

  it('denies a route with no @Roles() and not @Public() (fail closed)', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
      .mockReturnValueOnce(undefined); // ROLES_KEY
    expect(() => guard.canActivate(createMockContext())).toThrow(
      ForbiddenException,
    );
  });

  it('allows any authenticated user when @Roles() has no args', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce([]);
    expect(guard.canActivate(createMockContext({ roles: ['STUDENT'] }))).toBe(
      true,
    );
  });

  it('allows when the user has one of the required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(['ADMIN', 'BURSAR']);
    expect(guard.canActivate(createMockContext({ roles: ['BURSAR'] }))).toBe(
      true,
    );
  });

  it('denies when the user has none of the required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(['ADMIN']);
    expect(
      guard.canActivate(createMockContext({ roles: ['SUBJECT_TEACHER'] })),
    ).toBe(false);
  });

  it('denies when there is no authenticated user at all', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(['ADMIN']);
    expect(guard.canActivate(createMockContext(undefined))).toBe(false);
  });
});
