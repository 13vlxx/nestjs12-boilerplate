import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { JwtRefreshGuard } from '../../guards/jwt-refresh.guard.js';

/**
 * Route authenticated with the *refresh* token (as Bearer) instead of the
 * access token: skips the global JwtAuthGuard and runs JwtRefreshGuard.
 */
export const RefreshTokenProtected = () =>
  applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    UseGuards(JwtRefreshGuard),
    ApiOperation({ summary: '(REFRESH TOKEN as Bearer)' }),
  );
