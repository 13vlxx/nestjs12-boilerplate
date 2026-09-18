import {
  IsNumber,
  IsString,
  IsEnum,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { NodeEnvEnum } from './types/node-env.type.js';
import { plainToInstance, Type } from 'class-transformer';
import { Logger } from '@nestjs/common';
import { exit } from 'process';

export class ServerConfig {
  @IsNumber()
  PORT: number;

  @IsString()
  @IsEnum(NodeEnvEnum)
  NODE_ENV: NodeEnvEnum;
}

export class EnvironmentVariables {
  @ValidateNested()
  @Type(() => ServerConfig)
  SERVER: ServerConfig;
}

export function validateEnv(config: Record<string, unknown>) {
  const structuredConfig = {
    SERVER: {
      PORT: config.PORT,
      NODE_ENV: config.NODE_ENV,
    },
  };

  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    structuredConfig,
    {
      enableImplicitConversion: true,
    },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length) {
    new Logger(validateEnv.name).error(errors.toString());
    exit();
  }

  return validatedConfig;
}
