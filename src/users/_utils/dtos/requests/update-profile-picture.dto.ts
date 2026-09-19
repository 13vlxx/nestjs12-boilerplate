import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { uploadedFile } from '../../../../s3/_utils/schemas/uploaded-file.schema.js';
import { IMAGE_MIME_TYPES } from '../../../../s3/_utils/types/mime-type.enum.js';
import { PROFILE_PICTURE_MAX_SIZE } from '../../users.constants.js';

export const updateProfilePictureSchema = z.strictObject({
  file: uploadedFile({
    mimeTypes: IMAGE_MIME_TYPES,
    maxSize: PROFILE_PICTURE_MAX_SIZE,
  }),
});

export class UpdateProfilePictureDto extends createZodDto(
  updateProfilePictureSchema,
) {}
