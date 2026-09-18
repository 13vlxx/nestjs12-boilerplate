import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const verifyEmailSchema = z.strictObject({
  token: z.string().min(1),
});

export class VerifyEmailDto extends createZodDto(verifyEmailSchema) {}
