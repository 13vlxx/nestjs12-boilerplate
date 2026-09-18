import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import { UsersMapper } from '../users/users.mapper.js';
import { EncryptionService } from '../encryption/encryption.service.js';
import { AuthExceptions } from './_utils/errors/auth-exceptions.types.js';
import { RegisterDto } from './_utils/dtos/requests/register.dto.js';
import { LoginDto } from './_utils/dtos/requests/login.dto.js';
import { AuthResponseDto } from './_utils/dtos/responses/auth-response.dto.js';
import { JwtPayload } from './_utils/types/jwt-payload.type.js';
import { UserDocument } from '../users/users.schema.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly usersMapper: UsersMapper,
    private readonly encryptionService: EncryptionService,
    private readonly exceptions: AuthExceptions,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create(dto);
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmailOrNull(dto.email);
    if (!user) throw this.exceptions.WRONG_CREDENTIALS;

    const { isMatch, isEncryptionChanged } =
      await this.encryptionService.compare(dto.password, user.password);
    if (!isMatch) throw this.exceptions.WRONG_CREDENTIALS;

    if (isEncryptionChanged)
      await this.usersService.updatePassword(user, dto.password);

    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(
    user: UserDocument,
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: user._id.toString(), email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, user: this.usersMapper.toGetUserDto(user) };
  }
}
