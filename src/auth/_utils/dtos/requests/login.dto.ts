import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { passwordRegex } from '../../regex/password.regex.js';

export const loginSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(8).max(64).regex(passwordRegex),
});

export class LoginDto extends createZodDto(loginSchema) {}
