import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';
import { UserRoleEnum } from '../../../users/_utils/types/user-role.enum.js';

export const ROLES_KEY = 'roles';

/**
 * Every route is already protected by the global JwtAuthGuard. Use this to
 * additionally restrict a route (or a whole controller) to the given role(s).
 * Without arguments it is a no-op kept for readability.
 */
export const Protect = (...roles: UserRoleEnum[]) =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    ...(roles.length
      ? [
          ApiForbiddenResponse({
            description: `Requires role: ${roles.join(' | ')}`,
          }),
        ]
      : []),
  );
