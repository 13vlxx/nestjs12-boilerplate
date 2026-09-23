import type { Prisma } from '../../../_generated/prisma/client.js';

export const userInclude = {
  profilePicture: true,
} as const satisfies Prisma.UserInclude;

export type UserRecord = Prisma.UserGetPayload<{
  include: typeof userInclude;
}>;

export type UserInput = Pick<
  Prisma.UserCreateInput,
  'firstName' | 'lastName' | 'email' | 'password' | 'role' | 'isEmailVerified'
>;
