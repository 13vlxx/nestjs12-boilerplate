import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type {
  EnvironmentVariables,
  JwtConfig,
} from '../../_utils/config/env.config.js';
import { jwtPayloadSchema } from '../_utils/types/jwt-payload.type.js';
import { AuthExceptions } from '../_utils/errors/auth-exceptions.types.js';
import { UsersService } from '../../users/users.service.js';
import { UserDocument } from '../../users/users.schema.js';

export const JWT_STRATEGY_NAME = 'jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY_NAME) {
  constructor(
    configService: ConfigService<EnvironmentVariables, true>,
    private readonly usersService: UsersService,
    private readonly exceptions: AuthExceptions,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<JwtConfig>('JWT').ACCESS_TOKEN_SECRET,
    });
  }

  /** Whatever is returned here becomes `request.user`. */
  async validate(rawPayload: unknown): Promise<UserDocument> {
    const payload = jwtPayloadSchema.safeParse(rawPayload);
    if (!payload.success) throw this.exceptions.INVALID_TOKEN;

    const user = await this.usersService.findByIdOrNull(payload.data.sub);
    if (!user) throw this.exceptions.INVALID_TOKEN;

    return user;
  }
}
