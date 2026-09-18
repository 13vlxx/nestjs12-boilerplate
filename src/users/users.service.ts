import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository.js';
import { UsersMapper } from './users.mapper.js';
import { UsersExceptions } from './_utils/errors/users-exceptions.types.js';
import { EncryptionService } from '../encryption/encryption.service.js';
import { CreateUserDto } from './_utils/dtos/requests/create-user.dto.js';
import { GetUserDto } from './_utils/dtos/responses/get-user.dto.js';
import { UserDocument } from './users.schema.js';
import { UserRoleEnum } from './_utils/types/user-role.enum.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly mapper: UsersMapper,
    private readonly exceptions: UsersExceptions,
    private readonly encryptionService: EncryptionService,
  ) {}

  getMe = (user: UserDocument): GetUserDto => this.mapper.toGetUserDto(user);

  async findAll(): Promise<GetUserDto[]> {
    const users = await this.repository.findAll();
    return this.mapper.toGetUserDtos(users);
  }

  async create(
    dto: CreateUserDto,
    role: UserRoleEnum = UserRoleEnum.USER,
  ): Promise<UserDocument> {
    const existing = await this.repository.findByEmailOrNull(dto.email);
    if (existing) throw this.exceptions.EMAIL_ALREADY_USED;

    return this.repository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: await this.encryptionService.encrypt(dto.password),
      role,
      hashedRefreshToken: null,
    });
  }

  findById = (id: string): Promise<UserDocument> =>
    this.repository.findById(id);

  findByIdOrNull = (id: string): Promise<UserDocument | null> =>
    this.repository.findByIdOrNull(id);

  findByEmailOrNull = (email: string): Promise<UserDocument | null> =>
    this.repository.findByEmailOrNull(email);

  updateHashedRefreshToken = (
    user: UserDocument,
    hashedRefreshToken: string | null,
  ): Promise<UserDocument> =>
    this.repository.updateHashedRefreshToken(user, hashedRefreshToken);

  async updatePassword(
    user: UserDocument,
    plainPassword: string,
  ): Promise<UserDocument> {
    const hashedPassword = await this.encryptionService.encrypt(plainPassword);
    return this.repository.updatePassword(user, hashedPassword);
  }
}
