import { Injectable } from '@nestjs/common';
import { S3Service } from './s3.service.js';
import { GetS3FileDto } from './_utils/dtos/get-s3-file.dto.js';
import type { S3FileRecord } from './_utils/types/s3-file.type.js';
import type { MimeTypeEnum } from './_utils/types/mime-type.enum.js';

@Injectable()
export class S3Mapper {
  constructor(private readonly s3Service: S3Service) {}

  toGetS3FileDto = async (file: S3FileRecord): Promise<GetS3FileDto> => ({
    url: await this.s3Service.getPresignedUrl(file.key),
    fileName: file.fileName,
    // Stored as text; only ever written from a magic-bytes-checked upload.
    mimeType: file.mimeType as MimeTypeEnum,
    size: file.size,
  });

  toGetS3FileDtos = (files: S3FileRecord[]): Promise<GetS3FileDto[]> =>
    Promise.all(files.map(this.toGetS3FileDto));
}
