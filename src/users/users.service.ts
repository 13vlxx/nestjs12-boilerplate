import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository.js';
import { UsersMapper } from './users.mapper.js';
import { UsersExceptions } from './_utils/errors/users-exceptions.types.js';
import { EncryptionService } from '../encryption/encryption.service.js';
import { CreateUserDto } from './_utils/dtos/requests/create-user.dto.js';
import { GetUserDto } from './_utils/dtos/responses/get-user.dto.js';
import type { UserRecord } from './_utils/types/user.type.js';
import type {
  ActionTokenInput,
  ActionTokenRecord,
} from './_utils/types/action-token.type.js';
import { ActionTokenTypeEnum } from './_utils/types/action-token-type.enum.js';
import { UserRoleEnum } from './_utils/types/user-role.enum.js';
import { S3Service } from '../s3/s3.service.js';
import { S3KeysMapper } from '../s3/s3-keys.mapper.js';
import { UpdateProfilePictureDto } from './_utils/dtos/requests/update-profile-picture.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly mapper: UsersMapper,
    private readonly exceptions: UsersExceptions,
    private readonly encryptionService: EncryptionService,
    private readonly s3Service: S3Service,
    private readonly s3KeysMapper: S3KeysMapper,
  ) {}

  getMe = (user: UserRecord): Promise<GetUserDto> =>
    this.mapper.toGetUserDto(user);

  async updateProfilePicture(
    user: UserRecord,
    dto: UpdateProfilePictureDto,
  ): Promise<GetUserDto> {
    const picture = await this.s3Service.uploadFile(
      dto.file,
      this.s3KeysMapper.toProfilePictureFolder(user.id),
    );

    const updated = await this.repository.upsertProfilePicture(
      user.id,
      picture,
    );
    if (user.profilePicture)
      await this.s3Service.deleteFile(user.profilePicture.key);

    return this.mapper.toGetUserDto(updated);
  }

  async removeProfilePicture(user: UserRecord): Promise<GetUserDto> {
    if (!user.profilePicture) return this.mapper.toGetUserDto(user);

    const updated = await this.repository.deleteProfilePicture(user.id);
    await this.s3Service.deleteFile(user.profilePicture.key);

    return this.mapper.toGetUserDto(updated);
  }

  async findAll(): Promise<GetUserDto[]> {
    const users = await this.repository.findAll();
    return this.mapper.toGetUserDtos(users);
  }

  async create(
    dto: CreateUserDto,
    role: UserRoleEnum = UserRoleEnum.USER,
    isEmailVerified = false,
  ): Promise<UserRecord> {
    const existing = await this.repository.findByEmailOrNull(dto.email);
    if (existing) throw this.exceptions.EMAIL_ALREADY_USED;

    const hashedPassword = await this.encryptionService.encrypt(dto.password);
    return this.repository.create(dto, hashedPassword, role, isEmailVerified);
  }

  findById = (id: string): Promise<UserRecord> => this.repository.findById(id);

  findByIdOrNull = (id: string): Promise<UserRecord | null> =>
    this.repository.findByIdOrNull(id);

  findByEmailOrNull = (email: string): Promise<UserRecord | null> =>
    this.repository.findByEmailOrNull(email);

  findActionTokenOrNull = (
    type: ActionTokenTypeEnum,
    hash: string,
  ): Promise<ActionTokenRecord | null> =>
    this.repository.findActionTokenOrNull(type, hash);

  updateHashedRefreshToken = (
    user: UserRecord,
    hashedRefreshToken: string | null,
  ): Promise<UserRecord> =>
    this.repository.updateHashedRefreshToken(user.id, hashedRefreshToken);

  upsertActionToken = (
    user: UserRecord,
    type: ActionTokenTypeEnum,
    token: ActionTokenInput,
  ): Promise<UserRecord> =>
    this.repository.upsertActionToken(user.id, type, token);

  markEmailVerified = (user: UserRecord): Promise<UserRecord> =>
    this.repository.markEmailVerified(user.id);

  async updatePassword(
    user: UserRecord,
    plainPassword: string,
  ): Promise<UserRecord> {
    const hashedPassword = await this.encryptionService.encrypt(plainPassword);
    return this.repository.updatePassword(user.id, hashedPassword);
  }

  async resetPassword(
    user: UserRecord,
    plainPassword: string,
  ): Promise<UserRecord> {
    const hashedPassword = await this.encryptionService.encrypt(plainPassword);
    return this.repository.resetPassword(user.id, hashedPassword);
  }
}
