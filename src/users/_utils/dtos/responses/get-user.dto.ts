import { createZodDto } from 'nestjs-zod';
import z from 'zod';

// `.meta()` goes on the inner schema, before `.nullable()`: a bare nullable
// primitive becomes `type: [T, "null"]`, which Swagger renders as an array.
export const getUserSchema = z.strictObject({
  id: z.string().meta({ example: 'l19eye11g72d' }),
  email: z.string().meta({ example: 'john.doe@example.com' }).nullable(),
  name: z.string().meta({ example: 'John Doe' }).nullable(),
  profilePictureUrl: z
    .string()
    .meta({ description: 'Presigned URL, valid 15 minutes' })
    .nullable(),
});

export class GetUserDto extends createZodDto(getUserSchema) {}
