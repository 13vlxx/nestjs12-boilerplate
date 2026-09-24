import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { UsersMapper } from './users.mapper.js';
import { UsersExceptions } from './_utils/errors/users-exceptions.types.js';
import { LogtoModule } from '../logto/logto.module.js';
import { S3Module } from '../s3/s3.module.js';

@Module({
  imports: [LogtoModule, S3Module],
  controllers: [UsersController],
  providers: [UsersService, UsersMapper, UsersExceptions],
  exports: [UsersService],
})
export class UsersModule {}
