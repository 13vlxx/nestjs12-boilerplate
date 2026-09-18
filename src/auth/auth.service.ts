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
import { AuthExceptions } from './_utils/errors/auth-exceptions.types.js';
import { RegisterDto } from './_utils/dtos/requests/register.dto.js';
import { LoginDto } from './_utils/dtos/requests/login.dto.js';
import { AuthResponseDto } from './_utils/dtos/responses/auth-response.dto.js';
import { JwtPayload } from './_utils/types/jwt-payload.type.js';
import { hashToken } from './_utils/hash-token.js';
import { UserDocument } from '../users/users.schema.js';

@Injectable()
export class AuthService {
  private readonly jwtConfig: JwtConfig;

  constructor(
    configService: ConfigService<EnvironmentVariables, true>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly usersMapper: UsersMapper,
    private readonly encryptionService: EncryptionService,
    private readonly exceptions: AuthExceptions,
  ) {
    this.jwtConfig = configService.get<JwtConfig>('JWT');
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create(dto);
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

  refresh = (user: UserDocument): Promise<AuthResponseDto> =>
    this.issueTokens(user);

  async logout(user: UserDocument): Promise<void> {
    await this.usersService.updateHashedRefreshToken(user, null);
  }

  private async issueTokens(user: UserDocument): Promise<AuthResponseDto> {
    const payload = (): JwtPayload => ({
      sub: user._id.toString(),
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
      user: this.usersMapper.toGetUserDto(user),
    };
  }
}
