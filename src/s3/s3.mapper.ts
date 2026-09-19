import { Injectable } from '@nestjs/common';
import { S3Service } from './s3.service.js';
import { S3File } from './s3-file.schema.js';
import { GetS3FileDto } from './_utils/dtos/get-s3-file.dto.js';

@Injectable()
export class S3Mapper {
  constructor(private readonly s3Service: S3Service) {}

  toGetS3FileDto = async (file: S3File): Promise<GetS3FileDto> => ({
    url: await this.s3Service.getPresignedUrl(file.key),
    fileName: file.fileName,
    mimeType: file.mimeType,
    size: file.size,
  });

  toGetS3FileDtos = (files: S3File[]): Promise<GetS3FileDto[]> =>
    Promise.all(files.map(this.toGetS3FileDto));
}
