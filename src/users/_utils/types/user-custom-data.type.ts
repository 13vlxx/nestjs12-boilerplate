import z from 'zod';
import { storedS3FileSchema } from '../../../s3/_utils/schemas/stored-s3-file.schema.js';

export const userCustomDataSchema = z.object({
  profilePicture: storedS3FileSchema.nullable().catch(null),
});

export type UserCustomData = z.infer<typeof userCustomDataSchema>;
