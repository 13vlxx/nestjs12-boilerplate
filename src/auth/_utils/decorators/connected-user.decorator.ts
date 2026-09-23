import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UserRecord } from '../../../users/_utils/types/user.type.js';

/** The user resolved by JwtStrategy. Only meaningful on routes decorated with `@Protect()`. */
export const ConnectedUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserRecord =>
    ctx.switchToHttp().getRequest<Request & { user: UserRecord }>().user,
);
