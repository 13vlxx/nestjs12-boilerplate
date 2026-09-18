import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './users.schema.js';
import { UsersMapper } from './users.mapper.js';
import { UsersRepository } from './users.repository.js';
import { UsersExceptions } from './_utils/errors/users-exceptions.types.js';
import { EncryptionModule } from '../encryption/encryption.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    EncryptionModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersMapper, UsersRepository, UsersExceptions],
  exports: [UsersService, UsersMapper],
})
export class UsersModule {}
