import type { createManagementApi } from '@logto/api/management';
import type { LogtoService } from '../../logto.service.js';

export type LogtoManagementApi = ReturnType<
  typeof createManagementApi
>['apiClient'];

export type LogtoUser = NonNullable<
  Awaited<ReturnType<LogtoService['findUserByIdOrNull']>>
>;
