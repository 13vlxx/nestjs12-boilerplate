import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { getUserSchema } from '../../../../users/_utils/dtos/responses/get-user.dto.js';

export const authResponseSchema = z.strictObject({
  accessToken: z.string(),
  user: getUserSchema,
});

export class AuthResponseDto extends createZodDto(authResponseSchema) {}
