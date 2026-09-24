import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from '../app.module.js';
import type {
  EnvironmentVariables,
  LogtoConfig,
  ServerConfig,
} from '../_utils/config/env.config.js';
import { NodeEnvEnum } from '../_utils/config/types/node-env.type.js';
import { LOGTO_MANAGEMENT_API } from '../logto/logto.constants.js';
import { unwrap } from '../logto/_utils/logto-response.utils.js';
import type { LogtoManagementApi } from '../logto/_utils/types/logto.type.js';
import { ScopeEnum } from '../auth/_utils/types/scope.enum.js';
import { SEED_API_RESOURCE_NAME, seedRoles, seedUsers } from './seed.data.js';

/**
 * Drops the MongoDB database and recreates its indexes, then makes sure Logto
 * holds the API resource, its permissions (ScopeEnum), the roles and the users
 * of seed.data.ts. The Logto part is idempotent and never deletes anything.
 * Refuses to run in production.
 *
 *   pnpm seed
 */
async function seed() {
  const logger = new Logger('Seed');
  // Hide Nest's bootstrap chatter, then re-enable "log" for our own output.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  Logger.overrideLogger(['log', 'warn', 'error']);

  try {
    const config = app.get(ConfigService<EnvironmentVariables, true>);
    const { NODE_ENV } = config.get<ServerConfig>('SERVER');
    if (NODE_ENV === NodeEnvEnum.PROD)
      throw new Error('Refusing to seed a production database');

    const connection = app.get<Connection>(getConnectionToken());
    logger.log(`Dropping database "${connection.name}"…`);
    await connection.dropDatabase();
    // dropDatabase() removes the indexes too.
    await Promise.all(
      Object.values(connection.models).map((model) => model.syncIndexes()),
    );

    const api = app.get<LogtoManagementApi>(LOGTO_MANAGEMENT_API);
    const indicator = config.get<LogtoConfig>('LOGTO').API_RESOURCE;

    const scopeIds = await ensureApiResource(api, indicator);
    logger.log(`API resource ${indicator} with ${scopeIds.size} permission(s)`);

    const roleIds = await ensureRoles(api, scopeIds);
    logger.log(`Roles: ${[...roleIds.keys()].join(', ')}`);

    for (const user of seedUsers) {
      await ensureUser(api, user, roleIds);
      logger.log(`User ${user.email} (${user.roles.join(', ') || 'no role'})`);
    }

    logger.log('Seed complete');
  } finally {
    await app.close();
  }
}

/** Returns the permission ids by name. */
async function ensureApiResource(
  api: LogtoManagementApi,
  indicator: string,
): Promise<Map<string, string>> {
  const resources = await unwrap(
    api.GET('/api/resources', { params: { query: { includeScopes: 'true' } } }),
  );
  const resource =
    resources.find((r) => r.indicator === indicator) ??
    (await unwrap(
      api.POST('/api/resources', {
        body: { name: SEED_API_RESOURCE_NAME, indicator },
      }),
    ));

  const scopeIds = new Map(
    (resource.scopes ?? []).map((scope) => [scope.name, scope.id]),
  );
  for (const name of Object.values(ScopeEnum)) {
    if (scopeIds.has(name)) continue;
    const scope = await unwrap(
      api.POST('/api/resources/{resourceId}/scopes', {
        params: { path: { resourceId: resource.id } },
        body: { name },
      }),
    );
    scopeIds.set(name, scope.id);
  }
  return scopeIds;
}

/** Returns the role ids by name. */
async function ensureRoles(
  api: LogtoManagementApi,
  scopeIds: Map<string, string>,
): Promise<Map<string, string>> {
  const existing = await unwrap(
    api.GET('/api/roles', {
      params: { query: { type: 'User', page_size: 100 } },
    }),
  );
  const roleIds = new Map<string, string>();

  for (const { name, description, scopes } of seedRoles) {
    const wanted = scopes.map((scope) => scopeIds.get(scope)!);
    const role = existing.find((r) => r.name === name);

    if (!role) {
      const created = await unwrap(
        api.POST('/api/roles', {
          body: { name, description, type: 'User', scopeIds: wanted },
        }),
      );
      roleIds.set(name, created.id);
      continue;
    }

    const granted = await unwrap(
      api.GET('/api/roles/{id}/scopes', { params: { path: { id: role.id } } }),
    );
    const missing = wanted.filter((id) => !granted.some((s) => s.id === id));
    if (missing.length)
      await unwrap(
        api.POST('/api/roles/{id}/scopes', {
          params: { path: { id: role.id } },
          body: { scopeIds: missing },
        }),
      );
    roleIds.set(name, role.id);
  }
  return roleIds;
}

async function ensureUser(
  api: LogtoManagementApi,
  { email, name, password, roles }: (typeof seedUsers)[number],
  roleIds: Map<string, string>,
): Promise<void> {
  const [found] = await unwrap(
    api.GET('/api/users', {
      params: { query: {} },
      // Logto reads `search.<field>` / `mode.<field>`, not the documented deepObject.
      querySerializer: () =>
        new URLSearchParams({
          'search.primaryEmail': email,
          'mode.primaryEmail': 'exact',
        }).toString(),
    }),
  );
  const user =
    found ??
    (await unwrap(
      api.POST('/api/users', { body: { primaryEmail: email, name, password } }),
    ));

  const current = await unwrap(
    api.GET('/api/users/{userId}/roles', {
      params: { path: { userId: user.id } },
    }),
  );
  const missing = roles
    .map((role) => roleIds.get(role)!)
    .filter((id) => !current.some((r) => r.id === id));
  if (missing.length)
    await unwrap(
      api.POST('/api/users/{userId}/roles', {
        params: { path: { userId: user.id } },
        body: { roleIds: missing },
      }),
    );
}

await seed();
