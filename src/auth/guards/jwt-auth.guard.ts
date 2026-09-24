import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { jwtVerify, type JWTVerifyGetKey } from 'jose';
import type {
  EnvironmentVariables,
  LogtoConfig,
} from '../../_utils/config/env.config.js';
import { IS_PUBLIC_KEY } from '../_utils/decorators/public.decorator.js';
import { ROLES_KEY } from '../_utils/decorators/protect.decorator.js';
import { AuthExceptions } from '../_utils/errors/auth-exceptions.types.js';
import { LOGTO_JWKS } from '../_utils/auth.constants.js';
import {
  type AuthUser,
  authUserSchema,
} from '../_utils/types/auth-user.type.js';
import type { UserRoleEnum } from '../../users/_utils/types/user-role.enum.js';

/**
 * Registered as APP_GUARD: every route requires a Logto access token issued
 * for LOGTO_API_RESOURCE unless decorated with `@Public()`. The token is
 * verified locally against Logto's public keys (cached by jose): no call to
 * Logto per request. Routes decorated with `@Protect(...roles)` also require
 * one of those roles in the token's `roles` claim.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly issuer: string;
  private readonly audience: string;

  constructor(
    @Inject(LOGTO_JWKS) private readonly jwks: JWTVerifyGetKey,
    configService: ConfigService<EnvironmentVariables, true>,
    private readonly reflector: Reflector,
    private readonly exceptions: AuthExceptions,
  ) {
    const logto = configService.get<LogtoConfig>('LOGTO');
    this.issuer = new URL('/oidc', logto.ENDPOINT).toString();
    this.audience = logto.API_RESOURCE;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthUser }>();
    request.user = await this.authenticate(request);

    const roles = this.reflector.getAllAndOverride<UserRoleEnum[]>(
      ROLES_KEY,
      targets,
    );
    if (
      roles?.length &&
      !roles.some((role) => request.user.roles.includes(role))
    )
      throw this.exceptions.INSUFFICIENT_ROLE;

    return true;
  }

  private async authenticate(request: Request): Promise<AuthUser> {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw this.exceptions.INVALID_TOKEN;

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
      });
      return authUserSchema.parse(payload);
    } catch {
      throw this.exceptions.INVALID_TOKEN;
    }
  }
}
