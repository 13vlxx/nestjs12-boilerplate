import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { passwordRegex } from '../../regex/password.regex.js';

export const registerSchema = z.strictObject({
  firstName: z.string().min(1).max(64),
  lastName: z.string().min(1).max(64),
  email: z.email(),
  password: z.string().min(8).max(64).regex(passwordRegex),
});

export class RegisterDto extends createZodDto(registerSchema) {}
