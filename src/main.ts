import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MongoDBExceptionFilter } from './_utils/filters/mongo-exception.filter.js';
import validationPipeOptions from './_utils/config/validation-pipe-options.config.js';
import { ConfigService } from '@nestjs/config';
import {
  EnvironmentVariables,
  ServerConfig,
} from './_utils/config/env.config.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService<EnvironmentVariables, true>);

  const serverConfig = configService.get<ServerConfig>('SERVER');
  const port = serverConfig.PORT;

  app
    .setGlobalPrefix('api/v1')
    .useGlobalFilters(new MongoDBExceptionFilter())
    .useGlobalPipes(new ValidationPipe(validationPipeOptions));

  await app.listen(port);
  logger.log(`Listening at http://localhost:${port}/api/v1`);
}
await bootstrap();
