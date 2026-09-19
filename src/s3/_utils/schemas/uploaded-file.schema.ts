import z from 'zod';
import { MimeTypeEnum } from '../types/mime-type.enum.js';

interface UploadedFileOptions {
  mimeTypes: MimeTypeEnum[];
  maxSize: number;
}

// `type` is set from the file's magic bytes by FormDataInterceptor, so this
// validates the real content, not what the client declared. A refine rather
// than `.mime([...])`: the latter emits an `anyOf` that makes @nestjs/swagger
// drop the property type, and Swagger UI then loses the file picker.
export const uploadedFile = ({ mimeTypes, maxSize }: UploadedFileOptions) =>
  z
    .file()
    .max(maxSize)
    .refine((file) => mimeTypes.includes(file.type as MimeTypeEnum), {
      message: `Invalid file type, expected one of: ${mimeTypes.join(', ')}`,
    })
    .meta({ description: `Allowed types: ${mimeTypes.join(', ')}` });
