import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from '../app.module.js';
import type {
  EnvironmentVariables,
  ServerConfig,
} from '../_utils/config/env.config.js';
import { NodeEnvEnum } from '../_utils/config/types/node-env.type.js';
import { UsersService } from '../users/users.service.js';
import { seedUsers } from './seed.data.js';

/**
 * Drops the whole database, recreates the indexes and inserts the data from
 * seed.data.ts. Refuses to run in production.
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
    const usersService = app.get(UsersService);

    logger.log(`Dropping database "${connection.name}"…`);
    await connection.dropDatabase();

    // dropDatabase() removes the indexes too (e.g. the unique email index).
    await Promise.all(
      Object.values(connection.models).map((model) => model.syncIndexes()),
    );

    for (const { dto, role } of seedUsers) {
      await usersService.create(dto, role);
      logger.log(`Created ${role} ${dto.email}`);
    }

    logger.log('Seed complete');
  } finally {
    await app.close();
  }
}

await seed();
