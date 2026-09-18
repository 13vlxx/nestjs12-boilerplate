import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import type { ReactElement } from 'react';
import { render } from 'react-email';
import type {
  EnvironmentVariables,
  MailConfig,
  ServerConfig,
} from '../_utils/config/env.config.js';
import { EMAIL_TRANSPORTER } from './emails.constants.js';
import { verifyEmailTemplate } from './templates/verify-email.template.js';
import { resetPasswordTemplate } from './templates/reset-password.template.js';
import {
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from '../auth/_utils/auth.constants.js';
import type { UserDocument } from '../users/users.schema.js';

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  private readonly from: string;
  private readonly clientUrl: string;

  constructor(
    @Inject(EMAIL_TRANSPORTER) private readonly transporter: Transporter,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.from = configService.get<MailConfig>('MAIL').FROM;
    this.clientUrl = configService.get<ServerConfig>('SERVER').CLIENT_URL;
  }

  sendEmailVerification(user: UserDocument, token: string): Promise<void> {
    return this.send(
      user.email,
      'Verify your email address',
      verifyEmailTemplate({
        firstName: user.firstName,
        link: this.clientLink('/verify-email', token),
        expiresInHours: EMAIL_VERIFICATION_TOKEN_TTL_MS / 3_600_000,
      }),
    );
  }

  sendPasswordReset(user: UserDocument, token: string): Promise<void> {
    return this.send(
      user.email,
      'Reset your password',
      resetPasswordTemplate({
        firstName: user.firstName,
        link: this.clientLink('/reset-password', token),
        expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MS / 60_000,
      }),
    );
  }

  private clientLink(path: string, token: string): string {
    const url = new URL(path, this.clientUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private async send(
    to: string,
    subject: string,
    template: ReactElement,
  ): Promise<void> {
    const [html, text] = await Promise.all([
      render(template),
      render(template, { plainText: true }),
    ]);
    const info = await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      html,
      text,
    });
    this.logger.log(`Sent "${subject}" to ${to} (${info.messageId})`);
  }
}
