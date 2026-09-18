import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const forgotPasswordSchema = z.strictObject({
  email: z.email().meta({ example: 'john.doe@example.com' }),
});

export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) {}
