import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodResponse } from 'nestjs-zod';
import { AuthService } from './auth.service.js';
import { LoginDto } from './_utils/dtos/requests/login.dto.js';
import { RegisterDto } from './_utils/dtos/requests/register.dto.js';
import { AuthResponseDto } from './_utils/dtos/responses/auth-response.dto.js';
import { Public } from './_utils/decorators/public.decorator.js';
import { RefreshTokenProtected } from './_utils/decorators/refresh-token-protected.decorator.js';
import { ConnectedUser } from './_utils/decorators/connected-user.decorator.js';
import type { UserDocument } from '../users/users.schema.js';

// Credentials endpoints: tighter limit than the global one to slow down brute force.
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ZodResponse({ status: HttpStatus.CREATED, type: AuthResponseDto })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ZodResponse({ status: HttpStatus.OK, type: AuthResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @RefreshTokenProtected()
  @Post('refresh')
  @ZodResponse({ status: HttpStatus.OK, type: AuthResponseDto })
  refresh(@ConnectedUser() user: UserDocument): Promise<AuthResponseDto> {
    return this.authService.refresh(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@ConnectedUser() user: UserDocument): Promise<void> {
    return this.authService.logout(user);
  }
}
