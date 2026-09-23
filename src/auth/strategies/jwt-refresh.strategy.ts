import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type {
  EnvironmentVariables,
  JwtConfig,
} from '../../_utils/config/env.config.js';
import { jwtPayloadSchema } from '../_utils/types/jwt-payload.type.js';
import { AuthExceptions } from '../_utils/errors/auth-exceptions.types.js';
import { UsersService } from '../../users/users.service.js';
import type { UserRecord } from '../../users/_utils/types/user.type.js';
import { tokenMatchesHash } from '../_utils/token.utils.js';

export const JWT_REFRESH_STRATEGY_NAME = 'jwt-refresh';

/**
 * Validates a refresh token sent as `Authorization: Bearer <refreshToken>`:
 * signature + expiry (different secret than the access token), then the
 * token must match the hash stored on the user.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  JWT_REFRESH_STRATEGY_NAME,
) {
  constructor(
    configService: ConfigService<EnvironmentVariables, true>,
    private readonly usersService: UsersService,
    private readonly exceptions: AuthExceptions,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<JwtConfig>('JWT').REFRESH_TOKEN_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(request: Request, rawPayload: unknown): Promise<UserRecord> {
    const payload = jwtPayloadSchema.safeParse(rawPayload);
    if (!payload.success) throw this.exceptions.INVALID_REFRESH_TOKEN;

    const user = await this.usersService.findByIdOrNull(payload.data.sub);
    if (!user?.hashedRefreshToken) throw this.exceptions.INVALID_REFRESH_TOKEN;

    const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    if (
      !refreshToken ||
      !tokenMatchesHash(refreshToken, user.hashedRefreshToken)
    ) {
      // A valid-but-rotated token is being replayed: it was probably stolen.
      // Revoke the whole session so the legitimate client has to log in again.
      await this.usersService.updateHashedRefreshToken(user, null);
      throw this.exceptions.INVALID_REFRESH_TOKEN;
    }

    return user;
  }
}
