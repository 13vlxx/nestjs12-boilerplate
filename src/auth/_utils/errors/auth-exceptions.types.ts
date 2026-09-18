import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthExceptions {
  readonly WRONG_CREDENTIALS = new UnauthorizedException('WRONG_CREDENTIALS');
  readonly INVALID_TOKEN = new UnauthorizedException('INVALID_TOKEN');
  readonly INSUFFICIENT_ROLE = new ForbiddenException('INSUFFICIENT_ROLE');
}
