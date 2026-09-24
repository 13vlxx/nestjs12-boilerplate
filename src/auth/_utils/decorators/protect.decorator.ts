import { applyDecorators, SetMetadata } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  DECORATORS,
} from '@nestjs/swagger';
import type { ScopeEnum } from '../types/scope.enum.js';

export const SCOPES_KEY = 'scopes';

// Appends the access to the route's `@ApiOperation` summary, which therefore
// has to sit below `@Protect` (decorators apply bottom-up); above, it would
// overwrite the label.
const AccessLabel =
  (scopes: ScopeEnum[]): MethodDecorator & ClassDecorator =>
  (
    _target: object,
    _key?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    if (!descriptor) return;
    const operation = Reflect.getMetadata(
      DECORATORS.API_OPERATION,
      descriptor.value,
    ) as { summary?: string } | undefined;
    if (!operation?.summary) return;

    const label = scopes.length ? scopes.join(' + ') : 'ALL';
    Reflect.defineMetadata(
      DECORATORS.API_OPERATION,
      { ...operation, summary: `${operation.summary} (${label})` },
      descriptor.value,
    );
  };

/**
 * Every route is already protected by the global JwtAuthGuard; put
 * `@Protect()` on every non-public route anyway so access is readable at a
 * glance. With arguments, the access token must also carry all the given
 * permission(s). A bare `@Protect()` sets no scopes, so it never loosens a
 * controller-level restriction.
 */
export const Protect = (...scopes: ScopeEnum[]) =>
  applyDecorators(
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ...(scopes.length
      ? [
          SetMetadata(SCOPES_KEY, scopes),
          ApiForbiddenResponse({
            description: `Requires scope: ${scopes.join(' + ')}`,
          }),
        ]
      : []),
    AccessLabel(scopes),
  );
