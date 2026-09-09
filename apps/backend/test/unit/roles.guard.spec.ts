import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../src/common/security/roles.guard';

function contextWithUser(role?: Role): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard (RBAC)', () => {
  it('allows when no roles are required', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contextWithUser(Role.PARENT))).toBe(true);
  });

  it('allows a user with a permitted role', () => {
    const reflector = { getAllAndOverride: () => [Role.PARENT] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contextWithUser(Role.PARENT))).toBe(true);
  });

  it('denies a user without the required role', () => {
    const reflector = { getAllAndOverride: () => [Role.PLATFORM_ADMIN] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(contextWithUser(Role.PARENT))).toThrow(ForbiddenException);
  });

  it('denies when there is no authenticated user', () => {
    const reflector = { getAllAndOverride: () => [Role.PARENT] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(contextWithUser())).toThrow(ForbiddenException);
  });
});
