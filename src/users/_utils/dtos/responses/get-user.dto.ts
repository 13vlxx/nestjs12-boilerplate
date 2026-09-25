import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { UserRoleEnum } from '../../types/user-role.enum.js';

// `.meta()` goes on the inner schema, before `.nullable()`: a bare nullable
// primitive becomes `type: [T, "null"]`, which Swagger renders as an array.
export const getUserSchema = z.strictObject({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  isEmailVerified: z.boolean(),
  role: z.enum(UserRoleEnum),
  profilePictureUrl: z
    .string()
    .meta({ description: 'Presigned URL, valid 15 minutes' })
    .nullable(),
});

export class GetUserDto extends createZodDto(getUserSchema) {}
