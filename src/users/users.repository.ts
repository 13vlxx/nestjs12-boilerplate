import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersExceptions } from './_utils/errors/users-exceptions.types.js';
import { userInclude, type UserRecord } from './_utils/types/user.type.js';
import {
  actionTokenInclude,
  type ActionTokenInput,
  type ActionTokenRecord,
} from './_utils/types/action-token.type.js';
import { ActionTokenTypeEnum } from './_utils/types/action-token-type.enum.js';
import type { UserRoleEnum } from './_utils/types/user-role.enum.js';
import type { CreateUserDto } from './_utils/dtos/requests/create-user.dto.js';
import type { S3FileInput } from '../s3/_utils/types/s3-file.type.js';

@Injectable()
export class UsersRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exceptions: UsersExceptions,
  ) {}

  create = (
    dto: CreateUserDto,
    hashedPassword: string,
    role: UserRoleEnum,
    isEmailVerified: boolean,
  ): Promise<UserRecord> =>
    this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: this.normalizeEmail(dto.email),
        password: hashedPassword,
        role,
        isEmailVerified,
      },
      include: userInclude,
    });

  findAll = (): Promise<UserRecord[]> =>
    this.prisma.user.findMany({
      include: userInclude,
      orderBy: { createdAt: 'asc' },
    });

  async findById(id: string): Promise<UserRecord> {
    const user = await this.findByIdOrNull(id);
    if (!user) throw this.exceptions.USER_NOT_FOUND;
    return user;
  }

  findByIdOrNull = (id: string): Promise<UserRecord | null> =>
    this.prisma.user.findUnique({ where: { id }, include: userInclude });

  findByEmailOrNull = (email: string): Promise<UserRecord | null> =>
    this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
      include: userInclude,
    });

  findActionTokenOrNull = (
    type: ActionTokenTypeEnum,
    hash: string,
  ): Promise<ActionTokenRecord | null> =>
    this.prisma.actionToken.findUnique({
      where: { hash, type },
      include: actionTokenInclude,
    });

  updateHashedRefreshToken = (
    id: string,
    hashedRefreshToken: string | null,
  ): Promise<UserRecord> =>
    this.prisma.user.update({
      where: { id },
      data: { hashedRefreshToken },
      include: userInclude,
    });

  updatePassword = (id: string, hashedPassword: string): Promise<UserRecord> =>
    this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      include: userInclude,
    });

  upsertActionToken = (
    id: string,
    type: ActionTokenTypeEnum,
    token: ActionTokenInput,
  ): Promise<UserRecord> =>
    this.prisma.user.update({
      where: { id },
      data: {
        actionTokens: {
          upsert: {
            where: { userId_type: { userId: id, type } },
            create: { type, ...token },
            update: token,
          },
        },
      },
      include: userInclude,
    });

  upsertProfilePicture = (
    id: string,
    picture: S3FileInput,
  ): Promise<UserRecord> =>
    this.prisma.user.update({
      where: { id },
      data: {
        profilePicture: { upsert: { create: picture, update: picture } },
      },
      include: userInclude,
    });

  deleteProfilePicture = (id: string): Promise<UserRecord> =>
    this.prisma.user.update({
      where: { id },
      data: { profilePicture: { delete: true } },
      include: userInclude,
    });

  markEmailVerified = (id: string): Promise<UserRecord> =>
    this.prisma.user.update({
      where: { id },
      data: {
        isEmailVerified: true,
        actionTokens: {
          deleteMany: { type: ActionTokenTypeEnum.EMAIL_VERIFICATION },
        },
      },
      include: userInclude,
    });

  resetPassword = (id: string, hashedPassword: string): Promise<UserRecord> =>
    this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        hashedRefreshToken: null,
        actionTokens: {
          deleteMany: { type: ActionTokenTypeEnum.PASSWORD_RESET },
        },
      },
      include: userInclude,
    });

  // Postgres compares text case-sensitively: emails are stored and looked up lowercased.
  private normalizeEmail = (email: string): string =>
    email.trim().toLowerCase();
}
