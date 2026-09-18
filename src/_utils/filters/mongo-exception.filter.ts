import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { MongoError } from 'mongodb';

const DUPLICATE_KEY_CODES = [11000, 11001];

@Catch(MongoError)
export class MongoDBExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MongoDBExceptionFilter.name);

  catch(exception: MongoError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (DUPLICATE_KEY_CODES.includes(exception.code as number)) {
      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: 'DUPLICATE_KEY',
        error: 'Conflict',
      });
    }

    // Anything else is unexpected: log the details, never leak them to the client.
    this.logger.error(
      `Unhandled MongoError (code ${exception.code}): ${exception.message}`,
      exception.stack,
    );
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'INTERNAL_SERVER_ERROR',
      error: 'Internal Server Error',
    });
  }
}
