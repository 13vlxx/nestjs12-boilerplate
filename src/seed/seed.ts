import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../app.module.js';
import type {
  EnvironmentVariables,
  ServerConfig,
} from '../_utils/config/env.config.js';
import { NodeEnvEnum } from '../_utils/config/types/node-env.type.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EncryptionService } from '../encryption/encryption.service.js';
import { seedUsers } from './seed.data.js';

/**
 * Empties every table (the schema itself comes from the migrations, applied
 * by `pnpm seed` beforehand) and inserts the data from seed.data.ts. Refuses
 * to run in production.
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

    const prisma = app.get(PrismaService);
    const encryptionService = app.get(EncryptionService);

    logger.log('Truncating every table…');
    await truncateAllTables(prisma);

    for (const { dto, role } of seedUsers) {
      await prisma.user.create({
        data: {
          ...dto,
          password: await encryptionService.encrypt(dto.password),
          role,
          isEmailVerified: true,
        },
      });
      logger.log(`Created ${role} ${dto.email}`);
    }

    logger.log('Seed complete');
  } finally {
    await app.close();
  }
}

async function truncateAllTables(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ name: string }[]>`
    SELECT tablename AS name FROM pg_tables
    WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'
  `;
  if (!tables.length) return;

  // Table names come from the catalog, not from user input.
  const list = tables.map(({ name }) => `"${name}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

await seed();
