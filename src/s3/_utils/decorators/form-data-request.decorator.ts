import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import {
  createFormDataInterceptor,
  FormDataFileField,
} from '../interceptors/form-data.interceptor.js';

interface FormDataOptions {
  files: FormDataFileField[];
  maxFileSize: number;
}

export const FormDataRequest = ({ files, maxFileSize }: FormDataOptions) =>
  applyDecorators(
    UseInterceptors(
      FileFieldsInterceptor(files, {
        limits: {
          fileSize: maxFileSize,
          files: files.reduce((sum, { maxCount = 1 }) => sum + maxCount, 0),
        },
      }),
      createFormDataInterceptor(files),
    ),
    ApiConsumes('multipart/form-data'),
  );
