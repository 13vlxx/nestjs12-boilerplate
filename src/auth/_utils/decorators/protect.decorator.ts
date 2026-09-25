import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { UserRoleEnum } from '../../../users/_utils/types/user-role.enum.js';

export const ROLES_KEY = 'roles';

/**
 * Every route is already protected by the global JwtAuthGuard; put
 * `@Protect()` on every non-public route anyway so access is readable at a
 * glance. With roles, the user needs at least one of them. Roles on a route
 * replace those of its controller; a bare `@Protect()` sets no roles, so it
 * never loosens a controller-level restriction.
 */
export const Protect = (...roles: UserRoleEnum[]) =>
  applyDecorators(
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ...(roles.length
      ? [
          SetMetadata(ROLES_KEY, roles),
          ApiForbiddenResponse({
            description: `Requires role: ${roles.map((role) => role.toUpperCase()).join(' | ')}`,
          }),
        ]
      : []),
  );
