import { z } from 'zod';
import { NodeEnvEnum } from './types/node-env.type.js';

const serverConfigSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(NodeEnvEnum),
});

export const envSchema = z.object({
  SERVER: serverConfigSchema,
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type EnvironmentVariables = z.infer<typeof envSchema>;

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const result = envSchema.safeParse({
    SERVER: {
      PORT: config.PORT,
      NODE_ENV: config.NODE_ENV,
    },
  });

  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
