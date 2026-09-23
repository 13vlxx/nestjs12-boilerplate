import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type {
  EnvironmentVariables,
  JwtConfig,
} from '../_utils/config/env.config.js';
import { UsersService } from '../users/users.service.js';
import { UsersMapper } from '../users/users.mapper.js';
import { EncryptionService } from '../encryption/encryption.service.js';
import { EmailsService } from '../emails/emails.service.js';
import { AuthExceptions } from './_utils/errors/auth-exceptions.types.js';
import { RegisterDto } from './_utils/dtos/requests/register.dto.js';
import { LoginDto } from './_utils/dtos/requests/login.dto.js';
import { VerifyEmailDto } from './_utils/dtos/requests/verify-email.dto.js';
import { ForgotPasswordDto } from './_utils/dtos/requests/forgot-password.dto.js';
import { ResetPasswordDto } from './_utils/dtos/requests/reset-password.dto.js';
import { AuthResponseDto } from './_utils/dtos/responses/auth-response.dto.js';
import { JwtPayload } from './_utils/types/jwt-payload.type.js';
import { generateToken, hashToken } from './_utils/token.utils.js';
import {
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from './_utils/auth.constants.js';
import type { UserRecord } from '../users/_utils/types/user.type.js';
import type {
  ActionTokenInput,
  ActionTokenRecord,
} from '../users/_utils/types/action-token.type.js';
import { ActionTokenTypeEnum } from '../users/_utils/types/action-token-type.enum.js';

@Injectable()
export class AuthService {
  private readonly jwtConfig: JwtConfig;

  constructor(
    configService: ConfigService<EnvironmentVariables, true>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly usersMapper: UsersMapper,
    private readonly encryptionService: EncryptionService,
    private readonly emailsService: EmailsService,
    private readonly exceptions: AuthExceptions,
  ) {
    this.jwtConfig = configService.get<JwtConfig>('JWT');
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create(dto);
    await this.sendEmailVerification(user);
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmailOrNull(dto.email);
    if (!user) throw this.exceptions.WRONG_CREDENTIALS;

    const { isMatch, isEncryptionChanged } =
      await this.encryptionService.compare(dto.password, user.password);
    if (!isMatch) throw this.exceptions.WRONG_CREDENTIALS;

    if (isEncryptionChanged)
      await this.usersService.updatePassword(user, dto.password);

    return this.issueTokens(user);
  }

  refresh = (user: UserRecord): Promise<AuthResponseDto> =>
    this.issueTokens(user);

  async logout(user: UserRecord): Promise<void> {
    await this.usersService.updateHashedRefreshToken(user, null);
  }

  async sendEmailVerification(user: UserRecord): Promise<void> {
    if (user.isEmailVerified) throw this.exceptions.EMAIL_ALREADY_VERIFIED;

    const token = generateToken();
    await this.usersService.upsertActionToken(
      user,
      ActionTokenTypeEnum.EMAIL_VERIFICATION,
      this.actionToken(token, EMAIL_VERIFICATION_TOKEN_TTL_MS),
    );
    await this.emailsService.sendEmailVerification(user, token);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const token = await this.usersService.findActionTokenOrNull(
      ActionTokenTypeEnum.EMAIL_VERIFICATION,
      hashToken(dto.token),
    );
    if (!token || this.isExpired(token))
      throw this.exceptions.INVALID_VERIFICATION_TOKEN;

    await this.usersService.markEmailVerified(token.user);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmailOrNull(dto.email);
    if (!user) return;

    const token = generateToken();
    await this.usersService.upsertActionToken(
      user,
      ActionTokenTypeEnum.PASSWORD_RESET,
      this.actionToken(token, PASSWORD_RESET_TOKEN_TTL_MS),
    );
    await this.emailsService.sendPasswordReset(user, token);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const token = await this.usersService.findActionTokenOrNull(
      ActionTokenTypeEnum.PASSWORD_RESET,
      hashToken(dto.token),
    );
    if (!token || this.isExpired(token))
      throw this.exceptions.INVALID_RESET_TOKEN;

    await this.usersService.resetPassword(token.user, dto.password);
  }

  private actionToken(token: string, ttlMs: number): ActionTokenInput {
    return { hash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) };
  }

  private isExpired(token: ActionTokenRecord): boolean {
    return token.expiresAt.getTime() < Date.now();
  }

  private async issueTokens(user: UserRecord): Promise<AuthResponseDto> {
    const payload = (): JwtPayload => ({
      sub: user.id,
      email: user.email,
      jti: randomUUID(),
    });

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload()),
      this.jwtService.signAsync(payload(), {
        secret: this.jwtConfig.REFRESH_TOKEN_SECRET,
        expiresIn: this.jwtConfig.REFRESH_TOKEN_EXPIRATION,
      }),
    ]);

    await this.usersService.updateHashedRefreshToken(
      user,
      hashToken(refreshToken),
    );

    return {
      accessToken,
      refreshToken,
      user: await this.usersMapper.toGetUserDto(user),
    };
  }
}
