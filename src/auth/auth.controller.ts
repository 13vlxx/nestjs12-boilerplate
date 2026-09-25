import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodResponse } from 'nestjs-zod';
import { AuthService } from './auth.service.js';
import { LoginDto } from './_utils/dtos/requests/login.dto.js';
import { RegisterDto } from './_utils/dtos/requests/register.dto.js';
import { VerifyEmailDto } from './_utils/dtos/requests/verify-email.dto.js';
import { ForgotPasswordDto } from './_utils/dtos/requests/forgot-password.dto.js';
import { ResetPasswordDto } from './_utils/dtos/requests/reset-password.dto.js';
import { AuthResponseDto } from './_utils/dtos/responses/auth-response.dto.js';
import { Public } from './_utils/decorators/public.decorator.js';
import { RefreshTokenProtected } from './_utils/decorators/refresh-token-protected.decorator.js';
import { ConnectedUser } from './_utils/decorators/connected-user.decorator.js';
import { Protect } from './_utils/decorators/protect.decorator.js';
import type { UserDocument } from '../users/users.schema.js';

@Throttle({ default: { limit: 10, ttl: 60_000 } })
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Create an account and send the verification email',
  })
  @ZodResponse({ status: HttpStatus.CREATED, type: AuthResponseDto })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ZodResponse({ status: HttpStatus.OK, type: AuthResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @RefreshTokenProtected()
  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate the token pair',
    description: 'Send the refresh token (not the access token) as Bearer.',
  })
  @ZodResponse({ status: HttpStatus.OK, type: AuthResponseDto })
  refresh(@ConnectedUser() user: UserDocument): Promise<AuthResponseDto> {
    return this.authService.refresh(user);
  }

  @Post('logout')
  @Protect()
  @ApiOperation({ summary: 'Revoke the refresh token' })
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@ConnectedUser() user: UserDocument): Promise<void> {
    return this.authService.logout(user);
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify the email with the emailed token' })
  @HttpCode(HttpStatus.NO_CONTENT)
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @Protect()
  @ApiOperation({ summary: 'Send a new verification email' })
  @HttpCode(HttpStatus.NO_CONTENT)
  resendVerification(@ConnectedUser() user: UserDocument): Promise<void> {
    return this.authService.sendEmailVerification(user);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Send a password reset email' })
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Set a new password with the emailed token' })
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.authService.resetPassword(dto);
  }
}
