import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { JWT_STRATEGY_NAME } from '../strategies/jwt.strategy.js';
import { IS_PUBLIC_KEY } from '../_utils/decorators/public.decorator.js';
import { ROLES_KEY } from '../_utils/decorators/protect.decorator.js';
import { AuthExceptions } from '../_utils/errors/auth-exceptions.types.js';
import { UserRoleEnum } from '../../users/_utils/types/user-role.enum.js';
import type { UserRecord } from '../../users/_utils/types/user.type.js';

/**
 * Registered as APP_GUARD: every route requires a valid Bearer token unless
 * decorated with `@Public()`. Routes decorated with `@Protect(...roles)` also
 * require the connected user to have one of those roles.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY_NAME) {
  constructor(
    private readonly reflector: Reflector,
    private readonly exceptions: AuthExceptions,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    if (isPublic) return true;

    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) return false;

    const roles = this.reflector.getAllAndOverride<UserRoleEnum[]>(
      ROLES_KEY,
      targets,
    );
    if (!roles?.length) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user: UserRecord }>();
    if (!roles.includes(user.role)) throw this.exceptions.INSUFFICIENT_ROLE;

    return true;
  }
}
