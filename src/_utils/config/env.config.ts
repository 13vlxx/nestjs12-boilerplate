import { z } from 'zod';
import { NodeEnvEnum } from './types/node-env.type.js';

const commaSeparatedList = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const serverConfigSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(NodeEnvEnum),
  CORS_ORIGINS: commaSeparatedList,
});

const databaseConfigSchema = z.object({
  DATABASE_URL: z.string(),
  DATABASE_NAME: z.string(),
});

const jwtConfigSchema = z
  .object({
    ACCESS_TOKEN_SECRET: z.string().min(32),
    ACCESS_TOKEN_EXPIRATION: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_SECRET: z.string().min(32),
    REFRESH_TOKEN_EXPIRATION: z.coerce
      .number()
      .int()
      .positive()
      .default(7 * 24 * 3600),
  })
  .refine((jwt) => jwt.ACCESS_TOKEN_SECRET !== jwt.REFRESH_TOKEN_SECRET, {
    message: 'ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must differ',
    path: ['REFRESH_TOKEN_SECRET'],
  });

const throttleConfigSchema = z.object({
  TTL: z.coerce.number().int().positive().default(60_000),
  LIMIT: z.coerce.number().int().positive().default(100),
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
export type JwtConfig = z.infer<typeof jwtConfigSchema>;
export type ThrottleConfig = z.infer<typeof throttleConfigSchema>;

export const envSchema = z.object({
  SERVER: serverConfigSchema,
  DATABASE: databaseConfigSchema,
  JWT: jwtConfigSchema,
  THROTTLE: throttleConfigSchema,
});

export type EnvironmentVariables = z.infer<typeof envSchema>;

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const result = envSchema.safeParse({
    SERVER: {
      PORT: config.PORT,
      NODE_ENV: config.NODE_ENV,
      CORS_ORIGINS: config.CORS_ORIGINS,
    },
    DATABASE: {
      DATABASE_URL: config.DATABASE_URL,
      DATABASE_NAME: config.DATABASE_NAME,
    },
    JWT: {
      ACCESS_TOKEN_SECRET: config.JWT_ACCESS_TOKEN_SECRET,
      ACCESS_TOKEN_EXPIRATION: config.JWT_ACCESS_TOKEN_EXPIRATION,
      REFRESH_TOKEN_SECRET: config.JWT_REFRESH_TOKEN_SECRET,
      REFRESH_TOKEN_EXPIRATION: config.JWT_REFRESH_TOKEN_EXPIRATION,
    },
    THROTTLE: {
      TTL: config.THROTTLE_TTL,
      LIMIT: config.THROTTLE_LIMIT,
    },
  });

  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
