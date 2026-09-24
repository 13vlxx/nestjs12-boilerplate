import z from 'zod';
import { UserRoleEnum } from '../../../users/_utils/types/user-role.enum.js';

const isUserRole = (role: string): role is UserRoleEnum =>
  Object.values<string>(UserRoleEnum).includes(role);

export const authUserSchema = z
  .object({
    sub: z.string().min(1),
    roles: z.array(z.string()).catch([]),
  })
  .transform(({ sub, roles }) => ({
    id: sub,
    roles: roles.filter(isUserRole),
  }));

export type AuthUser = z.output<typeof authUserSchema>;
