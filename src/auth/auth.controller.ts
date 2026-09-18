import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodResponse } from 'nestjs-zod';
import { AuthService } from './auth.service.js';
import { LoginDto } from './_utils/dtos/requests/login.dto.js';
import { RegisterDto } from './_utils/dtos/requests/register.dto.js';
import { AuthResponseDto } from './_utils/dtos/responses/auth-response.dto.js';
import { Public } from './_utils/decorators/public.decorator.js';

@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Public()
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ZodResponse({ status: HttpStatus.CREATED, type: AuthResponseDto })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @ZodResponse({ status: HttpStatus.OK, type: AuthResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }
}
