import type { Prisma, S3File } from '../../../_generated/prisma/client.js';

export type S3FileRecord = S3File;

export type S3FileInput = Pick<
  Prisma.S3FileCreateInput,
  'key' | 'fileName' | 'mimeType' | 'size'
>;
