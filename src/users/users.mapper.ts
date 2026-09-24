import { Injectable } from '@nestjs/common';
import { GetUserDto } from './_utils/dtos/responses/get-user.dto.js';
import {
  type UserCustomData,
  userCustomDataSchema,
} from './_utils/types/user-custom-data.type.js';
import type { LogtoUser } from '../logto/_utils/types/logto.type.js';
import { S3Service } from '../s3/s3.service.js';
import { S3KeysMapper } from '../s3/s3-keys.mapper.js';

@Injectable()
export class UsersMapper {
  constructor(
    private readonly s3Service: S3Service,
    private readonly s3KeysMapper: S3KeysMapper,
  ) {}

  toGetUserDto = async (user: LogtoUser): Promise<GetUserDto> => {
    const { profilePicture } = this.toUserCustomData(user);
    return {
      id: user.id,
      email: user.primaryEmail,
      name: user.name,
      profilePictureUrl: profilePicture
        ? await this.s3Service.getPresignedUrl(profilePicture.key)
        : null,
    };
  };

  toGetUserDtos = (users: LogtoUser[]): Promise<GetUserDto[]> =>
    Promise.all(users.map(this.toGetUserDto));

  toUserCustomData(user: LogtoUser): UserCustomData {
    const customData = userCustomDataSchema.parse(user.customData);
    // Custom data can be edited outside this API (Logto console, Account API):
    // a key outside the user's own folder would let them read or delete any object.
    const folder = `${this.s3KeysMapper.toProfilePictureFolder(user.id)}/`;
    if (!customData.profilePicture?.key.startsWith(folder))
      return { ...customData, profilePicture: null };
    return customData;
  }
}
