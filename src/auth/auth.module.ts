import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type {
  EnvironmentVariables,
  JwtConfig,
} from '../_utils/config/env.config.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AuthExceptions } from './_utils/errors/auth-exceptions.types.js';
import { JWT_STRATEGY_NAME, JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { UsersModule } from '../users/users.module.js';
import { EncryptionModule } from '../encryption/encryption.module.js';
import { EmailsModule } from '../emails/emails.module.js';

@Global()
@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: JWT_STRATEGY_NAME,
      session: false,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
        const jwtConfig = config.get<JwtConfig>('JWT');
        return {
          secret: jwtConfig.ACCESS_TOKEN_SECRET,
          signOptions: { expiresIn: jwtConfig.ACCESS_TOKEN_EXPIRATION },
        };
      },
    }),
    UsersModule,
    EncryptionModule,
    EmailsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthExceptions,
    JwtStrategy,
    JwtRefreshStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
