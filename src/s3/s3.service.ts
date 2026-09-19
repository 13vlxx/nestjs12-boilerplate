import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  EnvironmentVariables,
  S3Config,
} from '../_utils/config/env.config.js';
import { PRESIGNED_URL_EXPIRATION_S, S3_CLIENT } from './s3.constants.js';
import { S3File } from './s3-file.schema.js';
import { MimeTypeEnum } from './_utils/types/mime-type.enum.js';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private readonly bucket: string;

  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.bucket = configService.get<S3Config>('S3').BUCKET;
  }

  async onModuleInit(): Promise<void> {
    if (await this.bucketExists()) return;
    await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    this.logger.log(`Bucket "${this.bucket}" created`);
  }

  async uploadFile(file: File, folder: string): Promise<S3File> {
    const key = `${folder}/${randomUUID()}${extname(file.name).toLowerCase()}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type,
      }),
    );

    return {
      key,
      fileName: file.name,
      mimeType: file.type as MimeTypeEnum,
      size: file.size,
    };
  }

  getPresignedUrl = (key: string): Promise<string> =>
    getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: PRESIGNED_URL_EXPIRATION_S },
    );

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  private async bucketExists(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch (error) {
      if (
        error instanceof S3ServiceException &&
        (error.name === 'NotFound' || error.$metadata.httpStatusCode === 404)
      )
        return false;
      throw error;
    }
  }
}
