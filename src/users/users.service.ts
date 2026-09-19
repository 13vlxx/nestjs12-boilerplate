import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository.js';
import { UsersMapper } from './users.mapper.js';
import { UsersExceptions } from './_utils/errors/users-exceptions.types.js';
import { EncryptionService } from '../encryption/encryption.service.js';
import { CreateUserDto } from './_utils/dtos/requests/create-user.dto.js';
import { GetUserDto } from './_utils/dtos/responses/get-user.dto.js';
import { ActionToken, UserDocument } from './users.schema.js';
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

  getMe = (user: UserDocument): Promise<GetUserDto> =>
    this.mapper.toGetUserDto(user);

  async updateProfilePicture(
    user: UserDocument,
    dto: UpdateProfilePictureDto,
  ): Promise<GetUserDto> {
    const picture = await this.s3Service.uploadFile(
      dto.file,
      this.s3KeysMapper.toProfilePictureFolder(user._id.toString()),
    );
    const previous = user.profilePicture;

    await this.repository.updateProfilePicture(user, picture);
    if (previous) await this.s3Service.deleteFile(previous.key);

    return this.mapper.toGetUserDto(user);
  }

  async removeProfilePicture(user: UserDocument): Promise<GetUserDto> {
    const previous = user.profilePicture;
    await this.repository.updateProfilePicture(user, null);
    if (previous) await this.s3Service.deleteFile(previous.key);
    return this.mapper.toGetUserDto(user);
  }

  async findAll(): Promise<GetUserDto[]> {
    const users = await this.repository.findAll();
    return this.mapper.toGetUserDtos(users);
  }

  async create(
    dto: CreateUserDto,
    role: UserRoleEnum = UserRoleEnum.USER,
    isEmailVerified = false,
  ): Promise<UserDocument> {
    const existing = await this.repository.findByEmailOrNull(dto.email);
    if (existing) throw this.exceptions.EMAIL_ALREADY_USED;

    return this.repository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      isEmailVerified,
      password: await this.encryptionService.encrypt(dto.password),
      role,
      hashedRefreshToken: null,
      emailVerificationToken: null,
      passwordResetToken: null,
      profilePicture: null,
    });
  }

  findById = (id: string): Promise<UserDocument> =>
    this.repository.findById(id);

  findByIdOrNull = (id: string): Promise<UserDocument | null> =>
    this.repository.findByIdOrNull(id);

  findByEmailOrNull = (email: string): Promise<UserDocument | null> =>
    this.repository.findByEmailOrNull(email);

  findByEmailVerificationTokenHashOrNull = (
    hash: string,
  ): Promise<UserDocument | null> =>
    this.repository.findByEmailVerificationTokenHashOrNull(hash);

  findByPasswordResetTokenHashOrNull = (
    hash: string,
  ): Promise<UserDocument | null> =>
    this.repository.findByPasswordResetTokenHashOrNull(hash);

  updateHashedRefreshToken = (
    user: UserDocument,
    hashedRefreshToken: string | null,
  ): Promise<UserDocument> =>
    this.repository.updateHashedRefreshToken(user, hashedRefreshToken);

  updateEmailVerificationToken = (
    user: UserDocument,
    token: ActionToken | null,
  ): Promise<UserDocument> =>
    this.repository.updateEmailVerificationToken(user, token);

  updatePasswordResetToken = (
    user: UserDocument,
    token: ActionToken | null,
  ): Promise<UserDocument> =>
    this.repository.updatePasswordResetToken(user, token);

  markEmailVerified = (user: UserDocument): Promise<UserDocument> =>
    this.repository.markEmailVerified(user);

  async updatePassword(
    user: UserDocument,
    plainPassword: string,
  ): Promise<UserDocument> {
    const hashedPassword = await this.encryptionService.encrypt(plainPassword);
    return this.repository.updatePassword(user, hashedPassword);
  }
}
