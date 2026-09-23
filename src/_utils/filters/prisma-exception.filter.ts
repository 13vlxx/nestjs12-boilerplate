import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../_generated/prisma/client.js';

const UNIQUE_CONSTRAINT_FAILED = 'P2002';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception.code === UNIQUE_CONSTRAINT_FAILED) {
      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: 'DUPLICATE_KEY',
        error: 'Conflict',
      });
    }

    // Anything else is unexpected: log the details, never leak them to the client.
    this.logger.error(
      `Unhandled Prisma error (code ${exception.code}): ${exception.message}`,
      exception.stack,
    );
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'INTERNAL_SERVER_ERROR',
      error: 'Internal Server Error',
    });
  }
}
