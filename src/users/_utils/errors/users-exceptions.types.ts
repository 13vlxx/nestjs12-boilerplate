import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class UsersExceptions {
  readonly USER_NOT_FOUND = new NotFoundException('USER_NOT_FOUND');
}
