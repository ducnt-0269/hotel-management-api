import { ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator.js';

import type { User, UserRole } from '../../users/entities/user.entity.js';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

// Registered as APP_GUARD after JwtAuthGuard, so `request.user` is already
// set whenever a route carries @Roles(). Public routes carry none and pass.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user: User }>();
    if (!roles.includes(user.role)) throw new ForbiddenException();
    return true;
  }
}
