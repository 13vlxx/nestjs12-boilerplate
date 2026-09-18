import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type {
  EnvironmentVariables,
  MailConfig,
} from '../_utils/config/env.config.js';
import { EMAIL_TRANSPORTER } from './emails.constants.js';
import { EmailsService } from './emails.service.js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EMAIL_TRANSPORTER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
        const mail = config.get<MailConfig>('MAIL');
        return createTransport({
          host: mail.HOST,
          port: mail.PORT,
          secure: mail.SECURE,
          auth: mail.USER
            ? { user: mail.USER, pass: mail.PASSWORD }
            : undefined,
        });
      },
    },
    EmailsService,
  ],
  exports: [EmailsService],
})
export class EmailsModule {}
