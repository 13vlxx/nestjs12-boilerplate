import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const findUsersQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export class FindUsersQueryDto extends createZodDto(findUsersQuerySchema) {}
