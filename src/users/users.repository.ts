import { Injectable } from '@nestjs/common';
import { User, UserDocument } from './users.schema.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersExceptions } from './_utils/errors/users-exceptions.types.js';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly exceptions: UsersExceptions,
  ) {}

  findById = (id: string): Promise<UserDocument> =>
    this.userModel.findById(id).orFail(this.exceptions.USER_NOT_FOUND).exec();
}
