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
import { LogtoService } from '../logto/logto.service.js';
import { unwrap } from '../logto/_utils/logto-response.utils.js';
import type { LogtoManagementApi } from '../logto/_utils/types/logto.type.js';
import {
  ACCESS_TOKEN_CLAIMS_SCRIPT,
  DEV_TOKEN_APP_NAME,
  SEED_API_RESOURCE_NAME,
  seedRoles,
  seedUsers,
} from './seed.data.js';

/**
 * Drops the MongoDB database and recreates its indexes, then makes sure Logto
 * holds the API resource, the access-token claims script (`roles` claim), the
 * roles, the users of seed.data.ts and the app used by `pnpm jwt`. The Logto part is idempotent and never
 * deletes anything.
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
    const logtoService = app.get(LogtoService);
    const indicator = config.get<LogtoConfig>('LOGTO').API_RESOURCE;

    await ensureApiResource(api, indicator);
    logger.log(`API resource ${indicator}`);

    await unwrap(
      api.PUT('/api/configs/jwt-customizer/{tokenTypePath}', {
        params: { path: { tokenTypePath: 'access-token' } },
        body: { script: ACCESS_TOKEN_CLAIMS_SCRIPT },
      }),
    );
    logger.log('Access-token claims script (roles)');

    const roleIds = await ensureRoles(api);
    logger.log(`Roles: ${[...roleIds.keys()].join(', ')}`);

    for (const user of seedUsers) {
      await ensureUser(api, logtoService, user, roleIds);
      logger.log(`User ${user.email} (${user.roles.join(', ') || 'no role'})`);
    }

    await ensureDevTokenApp(api);
    logger.log(`Application "${DEV_TOKEN_APP_NAME}" (pnpm jwt)`);

    logger.log('Seed complete');
  } finally {
    await app.close();
  }
}

async function ensureApiResource(
  api: LogtoManagementApi,
  indicator: string,
): Promise<void> {
  const resources = await unwrap(api.GET('/api/resources'));
  if (resources.some((resource) => resource.indicator === indicator)) return;

  await unwrap(
    api.POST('/api/resources', {
      body: { name: SEED_API_RESOURCE_NAME, indicator },
    }),
  );
}

/** Returns the role ids by name. */
async function ensureRoles(
  api: LogtoManagementApi,
): Promise<Map<string, string>> {
  const existing = await unwrap(
    api.GET('/api/roles', {
      params: { query: { type: 'User', page_size: 100 } },
    }),
  );
  const roleIds = new Map<string, string>();

  for (const { name, description, isDefault } of seedRoles) {
    const role = existing.find((r) => r.name === name);

    if (!role) {
      const created = await unwrap(
        api.POST('/api/roles', {
          body: { name, description, type: 'User', isDefault },
        }),
      );
      roleIds.set(name, created.id);
      continue;
    }

    if (role.isDefault !== isDefault)
      await unwrap(
        api.PATCH('/api/roles/{id}', {
          params: { path: { id: role.id } },
          body: { isDefault },
        }),
      );
    roleIds.set(name, role.id);
  }
  return roleIds;
}

async function ensureUser(
  api: LogtoManagementApi,
  logtoService: LogtoService,
  { email, name, password, roles }: (typeof seedUsers)[number],
  roleIds: Map<string, string>,
): Promise<void> {
  const user =
    (await logtoService.findUserByEmailOrNull(email)) ??
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

async function ensureDevTokenApp(api: LogtoManagementApi): Promise<void> {
  const apps = await unwrap(
    api.GET('/api/applications', {
      params: { query: { types: 'Traditional', page_size: 100 } },
    }),
  );
  if (apps.some((app) => app.name === DEV_TOKEN_APP_NAME)) return;

  await unwrap(
    api.POST('/api/applications', {
      body: {
        name: DEV_TOKEN_APP_NAME,
        type: 'Traditional',
        oidcClientMetadata: {
          // Never used by the token exchange, but Logto requires one. The
          // generated type wrongly expects objects: the API takes URL strings.
          redirectUris: ['http://localhost/unused'] as unknown as Record<
            string,
            unknown
          >[],
          postLogoutRedirectUris: [],
        },
        customClientMetadata: { allowTokenExchange: true },
      },
    }),
  );
}

await seed();
