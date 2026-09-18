import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { passwordRegex } from '../../../../_utils/regex/password.regex.js';

export const resetPasswordSchema = z.strictObject({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .max(64)
    .regex(passwordRegex)
    .meta({ example: 'Passw0rd!' }),
});

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
