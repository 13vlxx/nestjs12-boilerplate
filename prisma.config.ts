import { existsSync } from 'node:fs';
import { defineConfig, env } from 'prisma/config';

// The Prisma CLI does not load env files: mirror the app's precedence
// (.env.development first, then .env; already-set variables are kept).
for (const file of ['.env.development', '.env'])
  if (existsSync(file)) process.loadEnvFile(file);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
});
