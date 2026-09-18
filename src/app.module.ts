import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import {
  DatabaseConfig,
  EnvironmentVariables,
  validateEnv,
} from './_utils/config/env.config.js';
import { AuthModule } from './auth/auth.module.js';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: validateEnv,
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        uri: config.get<DatabaseConfig>('DATABASE').DATABASE_URL,
        dbName: config.get<DatabaseConfig>('DATABASE').DATABASE_NAME,
      }),
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
