import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Type,
  mixin,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { detectMimeType } from '../magic-bytes.js';

export interface FormDataFileField {
  name: string;
  maxCount?: number;
}

type MulterFiles = Record<string, Express.Multer.File[] | undefined>;

const toWebFile = (file: Express.Multer.File): File =>
  new File([new Uint8Array(file.buffer)], file.originalname, {
    type: detectMimeType(file.buffer) ?? 'application/octet-stream',
  });

// Runs after multer: moves req.files into req.body so the whole form,
// files included, is validated by the DTO like any other body.
export function createFormDataInterceptor(
  fields: FormDataFileField[],
): Type<NestInterceptor> {
  @Injectable()
  class FormDataInterceptor implements NestInterceptor {
    intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Observable<unknown> {
      const request = context
        .switchToHttp()
        .getRequest<Request & { files?: MulterFiles }>();
      const files = request.files ?? {};

      for (const { name, maxCount = 1 } of fields) {
        const uploaded = (files[name] ?? []).map(toWebFile);
        if (maxCount === 1) {
          if (uploaded[0]) request.body[name] = uploaded[0];
        } else if (uploaded.length) {
          request.body[name] = uploaded;
        }
      }

      return next.handle();
    }
  }

  return mixin(FormDataInterceptor);
}
