import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { MimeTypeEnum } from '../types/mime-type.enum.js';

export const getS3FileSchema = z.strictObject({
  url: z.string().meta({ description: 'Presigned URL' }),
  fileName: z.string(),
  mimeType: z.enum(MimeTypeEnum),
  size: z.number(),
});

export class GetS3FileDto extends createZodDto(getS3FileSchema) {}
