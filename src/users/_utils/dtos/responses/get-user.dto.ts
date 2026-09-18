import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { UserRoleEnum } from '../../types/user-role.enum.js';

export const getUserSchema = z.strictObject({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  isEmailVerified: z.boolean(),
  role: z.enum(UserRoleEnum),
});

export class GetUserDto extends createZodDto(getUserSchema) {}
