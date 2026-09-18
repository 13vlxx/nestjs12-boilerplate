import { Injectable } from '@nestjs/common';
import { GetUserDto } from './_utils/dtos/responses/get-user.dto.js';
import { UserDocument } from './users.schema.js';

@Injectable()
export class UsersMapper {
  constructor() {}

  toGetUserDto = (user: UserDocument): GetUserDto => ({
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  });
}
