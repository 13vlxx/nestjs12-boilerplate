import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const getUserSchema = z.strictObject({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
});

export class GetUserDto extends createZodDto(getUserSchema) {}
