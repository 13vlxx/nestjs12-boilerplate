import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class UsersExceptions {
  readonly USER_NOT_FOUND = new NotFoundException('USER_NOT_FOUND');
  readonly EMAIL_ALREADY_USED = new ConflictException('EMAIL_ALREADY_USED');
}
