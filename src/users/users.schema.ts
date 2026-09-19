import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRoleEnum } from './_utils/types/user-role.enum.js';
import { S3File, S3FileSchema } from '../s3/s3-file.schema.js';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: false })
export class ActionToken {
  @Prop({ type: String, required: true })
  hash: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

const ActionTokenSchema = SchemaFactory.createForClass(ActionToken);

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

  @Prop({ type: Boolean, required: true, default: false })
  isEmailVerified: boolean;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({
    type: String,
    enum: Object.values(UserRoleEnum),
    required: true,
    default: UserRoleEnum.USER,
  })
  role: UserRoleEnum;

  @Prop({ type: String, default: null })
  hashedRefreshToken: string | null;

  @Prop({ type: ActionTokenSchema, default: null })
  emailVerificationToken: ActionToken | null;

  @Prop({ type: ActionTokenSchema, default: null })
  passwordResetToken: ActionToken | null;

  @Prop({ type: S3FileSchema, default: null })
  profilePicture: S3File | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ 'emailVerificationToken.hash': 1 }, { sparse: true });
UserSchema.index({ 'passwordResetToken.hash': 1 }, { sparse: true });
