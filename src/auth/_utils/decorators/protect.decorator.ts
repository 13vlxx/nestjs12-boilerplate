import { applyDecorators, SetMetadata } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  DECORATORS,
} from '@nestjs/swagger';
import type { UserRoleEnum } from '../../../users/_utils/types/user-role.enum.js';

export const ROLES_KEY = 'roles';

const AccessLabel =
  (roles: UserRoleEnum[]): MethodDecorator & ClassDecorator =>
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

    const label = roles.length
      ? roles.map((role) => role.toUpperCase()).join(', ')
      : 'ALL';
    Reflect.defineMetadata(
      DECORATORS.API_OPERATION,
      { ...operation, summary: `${operation.summary} (${label})` },
      descriptor.value,
    );
  };

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
    AccessLabel(roles),
  );
