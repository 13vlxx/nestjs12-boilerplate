import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MimeTypeEnum } from './_utils/types/mime-type.enum.js';

@Schema({ _id: false })
export class S3File {
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: String, enum: Object.values(MimeTypeEnum), required: true })
  mimeType: MimeTypeEnum;

  @Prop({ type: Number, required: true })
  size: number;
}

export const S3FileSchema = SchemaFactory.createForClass(S3File);
