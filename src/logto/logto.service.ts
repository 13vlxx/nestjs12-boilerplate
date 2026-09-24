import { Inject, Injectable } from '@nestjs/common';
import { LOGTO_MANAGEMENT_API } from './logto.constants.js';
import { unwrap, unwrapOrNull } from './_utils/logto-response.utils.js';
import type { LogtoManagementApi } from './_utils/types/logto.type.js';

@Injectable()
export class LogtoService {
  constructor(
    @Inject(LOGTO_MANAGEMENT_API) private readonly api: LogtoManagementApi,
  ) {}

  findUserByIdOrNull = (userId: string) =>
    unwrapOrNull(
      this.api.GET('/api/users/{userId}', { params: { path: { userId } } }),
    );

  async findUserByEmailOrNull(email: string) {
    const [user] = await unwrap(
      this.api.GET('/api/users', {
        params: { query: {} },
        // Logto reads `search.<field>` / `mode.<field>`, not the documented deepObject.
        querySerializer: () =>
          new URLSearchParams({
            'search.primaryEmail': email,
            'mode.primaryEmail': 'exact',
          }).toString(),
      }),
    );
    return user ?? null;
  }

  findUsers = (page: number, pageSize: number) =>
    unwrap(
      this.api.GET('/api/users', {
        params: { query: { page, page_size: pageSize } },
      }),
    );

  // Logto merges the given keys into the existing custom data.
  updateUserCustomData = (
    userId: string,
    customData: Record<string, unknown>,
  ) =>
    unwrap(
      this.api.PATCH('/api/users/{userId}/custom-data', {
        params: { path: { userId } },
        body: { customData },
      }),
    );
}
