import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
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
import { DEV_TOKEN_APP_NAME } from './seed.data.js';

/**
 * Prints an access token for LOGTO_API_RESOURCE on behalf of the given user,
 * without a browser: the M2M app creates a subject token for the user, then
 * the "dev tokens" app (created by `pnpm seed`) exchanges it (RFC 8693).
 * The token carries the user's real roles. Refuses to run in production.
 *
 *   pnpm -s jwt admin@example.com
 */
async function jwt() {
  const email = process.argv[2];
  if (!email) throw new Error('Usage: pnpm jwt <email>');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });

  try {
    const config = app.get(ConfigService<EnvironmentVariables, true>);
    if (config.get<ServerConfig>('SERVER').NODE_ENV === NodeEnvEnum.PROD)
      throw new Error('Refusing to issue tokens in production');
    const logto = config.get<LogtoConfig>('LOGTO');

    const user = await app.get(LogtoService).findUserByEmailOrNull(email);
    if (!user) throw new Error(`No Logto user with email ${email}`);

    const api = app.get<LogtoManagementApi>(LOGTO_MANAGEMENT_API);
    const tokenApp = (
      await unwrap(
        api.GET('/api/applications', {
          params: { query: { types: 'Traditional', page_size: 100 } },
        }),
      )
    ).find((candidate) => candidate.name === DEV_TOKEN_APP_NAME);
    if (!tokenApp)
      throw new Error(
        `Application "${DEV_TOKEN_APP_NAME}" missing: run pnpm seed`,
      );

    const [secret] = await unwrap(
      api.GET('/api/applications/{id}/secrets', {
        params: { path: { id: tokenApp.id } },
      }),
    );
    const { subjectToken } = await unwrap(
      api.POST('/api/subject-tokens', { body: { userId: user.id } }),
    );

    const response = await fetch(new URL('/oidc/token', logto.ENDPOINT), {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${tokenApp.id}:${secret.value}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token: subjectToken,
        subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
        resource: logto.API_RESOURCE,
      }),
    });
    const body = (await response.json()) as { access_token?: string };
    if (!body.access_token)
      throw new Error(`Token exchange failed: ${JSON.stringify(body)}`);

    process.stdout.write(`${body.access_token}\n`);
  } finally {
    await app.close();
  }
}

await jwt();
