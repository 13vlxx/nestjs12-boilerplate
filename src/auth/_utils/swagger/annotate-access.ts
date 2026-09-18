import type { INestApplication } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import type { OpenAPIObject } from '@nestjs/swagger';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ROLES_KEY } from '../decorators/protect.decorator.js';
import type { UserRoleEnum } from '../../../users/_utils/types/user-role.enum.js';

/**
 * Prefixes every protected operation summary with who can call it, so it is
 * readable from the collapsed Swagger list: `(ALL)` for any authenticated
 * user, `(ADMIN)` / `(ADMIN, USER)` when restricted. Public routes are left
 * untouched.
 *
 * Works from the same metadata as JwtAuthGuard, so it can never drift from
 * the actual behaviour, whatever the decorator order.
 */
export function annotateSwaggerWithAccess(
  app: INestApplication,
  document: OpenAPIObject,
): OpenAPIObject {
  const discovery = app.get(DiscoveryService);
  const scanner = app.get(MetadataScanner);
  const reflector = app.get(Reflector);

  const labelByOperationId = new Map<string, string>();

  for (const wrapper of discovery.getControllers()) {
    const { instance, metatype } = wrapper;
    if (!instance || !metatype) continue;

    const prototype = Object.getPrototypeOf(instance);
    for (const methodName of scanner.getAllMethodNames(prototype)) {
      const targets = [prototype[methodName], metatype];

      const isPublic = reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        targets,
      );
      const roles = reflector.getAllAndOverride<UserRoleEnum[]>(
        ROLES_KEY,
        targets,
      );

      if (isPublic) continue;

      const label = roles?.length
        ? roles.map((role) => role.toUpperCase()).join(', ')
        : 'ALL';
      labelByOperationId.set(`${metatype.name}_${methodName}`, label);
    }
  }

  for (const pathItem of Object.values(document.paths)) {
    for (const operation of Object.values(pathItem)) {
      if (typeof operation !== 'object' || !('operationId' in operation))
        continue;

      const label = labelByOperationId.get(operation.operationId ?? '');
      if (!label) continue;

      operation.summary = `(${label}) ${operation.summary ?? ''}`.trim();
    }
  }

  return document;
}
