import z from 'zod';
import { MimeTypeEnum } from '../types/mime-type.enum.js';
import type { S3File } from '../../s3-file.schema.js';

export const storedS3FileSchema = z.object({
  key: z.string().min(1),
  fileName: z.string(),
  mimeType: z.enum(MimeTypeEnum),
  size: z.number().int().nonnegative(),
}) satisfies z.ZodType<S3File>;
