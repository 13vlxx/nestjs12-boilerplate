import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opts a route (or a whole controller) out of the global JwtAuthGuard. */
export const Public = () =>
  applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    // Empty security requirement: overrides the global bearer requirement in Swagger.
    ApiSecurity({}),
  );
