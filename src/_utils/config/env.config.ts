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

const logtoConfigSchema = z.object({
  ENDPOINT: z.url(),
  API_RESOURCE: z.string().min(1),
  M2M_CLIENT_ID: z.string().min(1),
  M2M_CLIENT_SECRET: z.string().min(1),
});

const s3ConfigSchema = z.object({
  ENDPOINT: z.url(),
  REGION: z.string().default('us-east-1'),
  ACCESS_KEY: z.string(),
  SECRET_KEY: z.string(),
  BUCKET: z.string(),
  FORCE_PATH_STYLE: z.stringbool().default(true),
});

const throttleConfigSchema = z.object({
  TTL: z.coerce.number().int().positive().default(60_000),
  LIMIT: z.coerce.number().int().positive().default(100),
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
export type LogtoConfig = z.infer<typeof logtoConfigSchema>;
export type ThrottleConfig = z.infer<typeof throttleConfigSchema>;
export type S3Config = z.infer<typeof s3ConfigSchema>;

export const envSchema = z.object({
  SERVER: serverConfigSchema,
  DATABASE: databaseConfigSchema,
  LOGTO: logtoConfigSchema,
  THROTTLE: throttleConfigSchema,
  S3: s3ConfigSchema,
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
    LOGTO: {
      ENDPOINT: config.LOGTO_ENDPOINT,
      API_RESOURCE: config.LOGTO_API_RESOURCE,
      M2M_CLIENT_ID: config.LOGTO_M2M_CLIENT_ID,
      M2M_CLIENT_SECRET: config.LOGTO_M2M_CLIENT_SECRET,
    },
    THROTTLE: {
      TTL: config.THROTTLE_TTL,
      LIMIT: config.THROTTLE_LIMIT,
    },
    S3: {
      ENDPOINT: config.S3_ENDPOINT,
      REGION: config.S3_REGION,
      ACCESS_KEY: config.S3_ACCESS_KEY,
      SECRET_KEY: config.S3_SECRET_KEY,
      BUCKET: config.S3_BUCKET,
      FORCE_PATH_STYLE: config.S3_FORCE_PATH_STYLE,
    },
  });

  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
