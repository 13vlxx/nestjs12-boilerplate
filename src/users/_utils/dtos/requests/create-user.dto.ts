import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { passwordRegex } from '../../../../_utils/regex/password.regex.js';

export const createUserSchema = z.strictObject({
  firstName: z.string().min(1).max(64).meta({
    example: 'John',
  }),
  lastName: z.string().min(1).max(64).meta({
    example: 'Doe',
  }),
  email: z.email().meta({ example: 'example@example.com' }),
  password: z.string().min(8).max(64).regex(passwordRegex).meta({
    description:
      '8-64 chars, at least one lowercase, one uppercase, one digit and one special char (@$!%*?&)',
    example: 'P@ssw0rd',
  }),
});

export class CreateUserDto extends createZodDto(createUserSchema) {}
