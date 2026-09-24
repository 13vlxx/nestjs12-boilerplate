import { Injectable } from '@nestjs/common';
import { UsersMapper } from './users.mapper.js';
import { UsersExceptions } from './_utils/errors/users-exceptions.types.js';
import { GetUserDto } from './_utils/dtos/responses/get-user.dto.js';
import { FindUsersQueryDto } from './_utils/dtos/requests/find-users-query.dto.js';
import { UpdateProfilePictureDto } from './_utils/dtos/requests/update-profile-picture.dto.js';
import type { UserCustomData } from './_utils/types/user-custom-data.type.js';
import type { AuthUser } from '../auth/_utils/types/auth-user.type.js';
import { LogtoService } from '../logto/logto.service.js';
import type { LogtoUser } from '../logto/_utils/types/logto.type.js';
import { S3Service } from '../s3/s3.service.js';
import { S3KeysMapper } from '../s3/s3-keys.mapper.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly logtoService: LogtoService,
    private readonly mapper: UsersMapper,
    private readonly exceptions: UsersExceptions,
    private readonly s3Service: S3Service,
    private readonly s3KeysMapper: S3KeysMapper,
  ) {}

  async getMe(authUser: AuthUser): Promise<GetUserDto> {
    const user = await this.findById(authUser.id);
    return this.mapper.toGetUserDto(user);
  }

  async updateProfilePicture(
    authUser: AuthUser,
    dto: UpdateProfilePictureDto,
  ): Promise<GetUserDto> {
    const user = await this.findById(authUser.id);
    const { profilePicture: previous } = this.mapper.toUserCustomData(user);

    const picture = await this.s3Service.uploadFile(
      dto.file,
      this.s3KeysMapper.toProfilePictureFolder(user.id),
    );
    const updated = await this.updateCustomData(user, {
      profilePicture: picture,
    });
    if (previous) await this.s3Service.deleteFile(previous.key);

    return this.mapper.toGetUserDto(updated);
  }

  async removeProfilePicture(authUser: AuthUser): Promise<GetUserDto> {
    const user = await this.findById(authUser.id);
    const { profilePicture: previous } = this.mapper.toUserCustomData(user);
    if (!previous) return this.mapper.toGetUserDto(user);

    const updated = await this.updateCustomData(user, { profilePicture: null });
    await this.s3Service.deleteFile(previous.key);

    return this.mapper.toGetUserDto(updated);
  }

  async findAll(query: FindUsersQueryDto): Promise<GetUserDto[]> {
    const users = await this.logtoService.findUsers(query.page, query.pageSize);
    return this.mapper.toGetUserDtos(users);
  }

  async findById(id: string): Promise<LogtoUser> {
    const user = await this.logtoService.findUserByIdOrNull(id);
    if (!user) throw this.exceptions.USER_NOT_FOUND;
    return user;
  }

  private async updateCustomData(
    user: LogtoUser,
    customData: Partial<UserCustomData>,
  ): Promise<LogtoUser> {
    const updated = await this.logtoService.updateUserCustomData(
      user.id,
      customData,
    );
    return { ...user, customData: updated };
  }
}
