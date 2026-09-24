import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { createRemoteJWKSet } from 'jose';
import type {
  EnvironmentVariables,
  LogtoConfig,
} from '../_utils/config/env.config.js';
import { AuthExceptions } from './_utils/errors/auth-exceptions.types.js';
import { LOGTO_JWKS } from './_utils/auth.constants.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LOGTO_JWKS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        createRemoteJWKSet(
          new URL('/oidc/jwks', config.get<LogtoConfig>('LOGTO').ENDPOINT),
        ),
    },
    AuthExceptions,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
