import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRoleEnum } from './_utils/types/user-role.enum.js';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, required: true })
  lastName: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({
    type: String,
    enum: Object.values(UserRoleEnum),
    required: true,
    default: UserRoleEnum.USER,
  })
  role: UserRoleEnum;

  /** Hash of the current refresh token (single device). null = logged out. */
  @Prop({ type: String, default: null })
  hashedRefreshToken: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
