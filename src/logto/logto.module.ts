import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createManagementApi } from '@logto/api/management';
import type {
  EnvironmentVariables,
  LogtoConfig,
} from '../_utils/config/env.config.js';
import {
  LOGTO_MANAGEMENT_API,
  LOGTO_MANAGEMENT_API_INDICATOR,
  LOGTO_TENANT_ID,
} from './logto.constants.js';
import { LogtoService } from './logto.service.js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LOGTO_MANAGEMENT_API,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
        const logto = config.get<LogtoConfig>('LOGTO');
        return createManagementApi(LOGTO_TENANT_ID, {
          clientId: logto.M2M_CLIENT_ID,
          clientSecret: logto.M2M_CLIENT_SECRET,
          baseUrl: logto.ENDPOINT,
          apiIndicator: LOGTO_MANAGEMENT_API_INDICATOR,
        }).apiClient;
      },
    },
    LogtoService,
  ],
  exports: [LogtoService, LOGTO_MANAGEMENT_API],
})
export class LogtoModule {}
