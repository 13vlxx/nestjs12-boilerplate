import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import type {
  EnvironmentVariables,
  S3Config,
} from '../_utils/config/env.config.js';
import { S3_CLIENT } from './s3.constants.js';
import { S3Service } from './s3.service.js';
import { S3KeysMapper } from './s3-keys.mapper.js';
import { S3Mapper } from './s3.mapper.js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
        const s3 = config.get<S3Config>('S3');
        return new S3Client({
          endpoint: s3.ENDPOINT,
          region: s3.REGION,
          forcePathStyle: s3.FORCE_PATH_STYLE,
          credentials: {
            accessKeyId: s3.ACCESS_KEY,
            secretAccessKey: s3.SECRET_KEY,
          },
        });
      },
    },
    S3Service,
    S3KeysMapper,
    S3Mapper,
  ],
  exports: [S3Service, S3KeysMapper, S3Mapper],
})
export class S3Module {}
