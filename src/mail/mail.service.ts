import { MailerQueueService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import { EnvService } from '../config/env.service.js';
import { activationEmail } from './templates/activation-email.js';

import type { User } from '../users/entities/user.entity.js';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerQueueService: MailerQueueService,
    private readonly envService: EnvService,
    private readonly i18nService: I18nService,
  ) {}

  // Queued, not sent inline: registration must not wait on SMTP.
  async enqueueActivationEmail(
    user: User,
    rawToken: string,
    lang: string,
  ): Promise<void> {
    const url = `${this.envService.get('APP_BASE_URL')}/api/auth/activate?token=${rawToken}`;
    await this.mailerQueueService.enqueue({
      to: user.email,
      ...activationEmail(this.i18nService, lang, user, url),
    });
  }
}
