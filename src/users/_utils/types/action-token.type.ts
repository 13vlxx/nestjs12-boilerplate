import type { Prisma } from '../../../_generated/prisma/client.js';
import { userInclude } from './user.type.js';

export const actionTokenInclude = {
  user: { include: userInclude },
} as const satisfies Prisma.ActionTokenInclude;

export type ActionTokenRecord = Prisma.ActionTokenGetPayload<{
  include: typeof actionTokenInclude;
}>;

export type ActionTokenInput = Pick<
  Prisma.ActionTokenCreateInput,
  'hash' | 'expiresAt'
>;
