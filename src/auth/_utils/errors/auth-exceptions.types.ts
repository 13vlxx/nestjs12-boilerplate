import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthExceptions {
  readonly INVALID_TOKEN = new UnauthorizedException('INVALID_TOKEN');
  readonly INSUFFICIENT_SCOPE = new ForbiddenException('INSUFFICIENT_SCOPE');
}
