import { Injectable } from '@nestjs/common';
import { GetUserDto } from './_utils/dtos/responses/get-user.dto.js';
import { UserDocument } from './users.schema.js';
import { S3Service } from '../s3/s3.service.js';

@Injectable()
export class UsersMapper {
  constructor(private readonly s3Service: S3Service) {}

  toGetUserDto = async (user: UserDocument): Promise<GetUserDto> => ({
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    role: user.role,
    profilePictureUrl: user.profilePicture
      ? await this.s3Service.getPresignedUrl(user.profilePicture.key)
      : null,
  });

  toGetUserDtos = (users: UserDocument[]): Promise<GetUserDto[]> =>
    Promise.all(users.map(this.toGetUserDto));
}
