import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module.js';
import { MongoDBExceptionFilter } from './_utils/filters/mongo-exception.filter.js';
import swaggerCustomOptions from './_utils/config/swagger-custom-options.config.js';
import type {
  EnvironmentVariables,
  ServerConfig,
} from './_utils/config/env.config.js';
import { NodeEnvEnum } from './_utils/config/types/node-env.type.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService<EnvironmentVariables, true>);

  const serverConfig = configService.get<ServerConfig>('SERVER');
  const port = serverConfig.PORT;
  const nodeEnv = serverConfig.NODE_ENV;
  const isProd = nodeEnv === NodeEnvEnum.PROD;

  app
    .setGlobalPrefix('api/v1')
    .useGlobalFilters(new MongoDBExceptionFilter());

  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('NestJS API')
      .setDescription('NestJS API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(
      'api/doc',
      app,
      cleanupOpenApiDoc(document),
      swaggerCustomOptions,
    );
  }

  await app.listen(port);
  logger.log(`Listening at http://localhost:${port}/api/v1`);
  logger.log(`Swagger UI available at http://localhost:${port}/api/doc`);
}
await bootstrap();
