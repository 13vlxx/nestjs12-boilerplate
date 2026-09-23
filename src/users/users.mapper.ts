import { Injectable } from '@nestjs/common';
import { GetUserDto } from './_utils/dtos/responses/get-user.dto.js';
import type { UserRecord } from './_utils/types/user.type.js';
import { S3Service } from '../s3/s3.service.js';

@Injectable()
export class UsersMapper {
  constructor(private readonly s3Service: S3Service) {}

  toGetUserDto = async (user: UserRecord): Promise<GetUserDto> => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    role: user.role,
    profilePictureUrl: user.profilePicture
      ? await this.s3Service.getPresignedUrl(user.profilePicture.key)
      : null,
  });

  toGetUserDtos = (users: UserRecord[]): Promise<GetUserDto[]> =>
    Promise.all(users.map(this.toGetUserDto));
}
