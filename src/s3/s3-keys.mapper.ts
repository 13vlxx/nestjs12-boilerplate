import { Injectable } from '@nestjs/common';

@Injectable()
export class S3KeysMapper {
  toProfilePictureFolder = (userId: string): string =>
    `users/${userId}/profile-picture`;
}
