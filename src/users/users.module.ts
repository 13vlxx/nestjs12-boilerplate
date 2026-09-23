import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { UsersMapper } from './users.mapper.js';
import { UsersRepository } from './users.repository.js';
import { UsersExceptions } from './_utils/errors/users-exceptions.types.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EncryptionModule } from '../encryption/encryption.module.js';
import { S3Module } from '../s3/s3.module.js';

@Module({
  imports: [PrismaModule, EncryptionModule, S3Module],
  controllers: [UsersController],
  providers: [UsersService, UsersMapper, UsersRepository, UsersExceptions],
  exports: [UsersService, UsersMapper],
})
export class UsersModule {}
