import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthExceptions {
  readonly WRONG_CREDENTIALS = new UnauthorizedException('WRONG_CREDENTIALS');
  readonly INVALID_TOKEN = new UnauthorizedException('INVALID_TOKEN');
  readonly INVALID_REFRESH_TOKEN = new UnauthorizedException(
    'INVALID_REFRESH_TOKEN',
  );
  readonly INSUFFICIENT_ROLE = new ForbiddenException('INSUFFICIENT_ROLE');
  readonly INVALID_VERIFICATION_TOKEN = new BadRequestException(
    'INVALID_VERIFICATION_TOKEN',
  );
  readonly INVALID_RESET_TOKEN = new BadRequestException('INVALID_RESET_TOKEN');
  readonly EMAIL_ALREADY_VERIFIED = new ConflictException(
    'EMAIL_ALREADY_VERIFIED',
  );
}
