import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { UserDocument } from '../../../users/users.schema.js';

/** The user resolved by JwtStrategy. Only meaningful on routes decorated with `@Protect()`. */
export const ConnectedUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserDocument =>
    ctx.switchToHttp().getRequest<Request & { user: UserDocument }>().user,
);
