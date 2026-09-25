import { MailerQueueService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import { DEFAULT_LANGUAGE } from '../common/i18n/default-language.js';
import { EnvService } from '../config/env.service.js';
import { activationEmail } from './templates/activation-email.js';
import { bookingRequestApprovalEmail } from './templates/booking-request-approval-email.js';
import { bookingRequestExpirationEmail } from './templates/booking-request-expiration-email.js';
import { bookingRequestRejectionEmail } from './templates/booking-request-rejection-email.js';

import type { BookingRequestMailData } from '../booking-requests/booking-request-mail-data.js';
import type { User } from '../users/entities/user.entity.js';
import type { ISendMailOptions } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerQueueService: MailerQueueService,
    private readonly envService: EnvService,
    private readonly i18nService: I18nService,
  ) {}

  // A mail never fails the action that triggered it: that change is already
  // committed, so a mail that cannot be queued is logged and dropped.
  private async enqueue(mail: ISendMailOptions): Promise<void> {
    try {
      await this.mailerQueueService.enqueue(mail);
    } catch (error) {
      this.logger.error(`Could not queue "${mail.template}" mail`, error);
    }
  }

  // Queued, not sent inline: registration must not wait on SMTP.
  async enqueueActivationEmail(
    user: User,
    rawToken: string,
    lang: string,
  ): Promise<void> {
    const url = `${this.envService.get('APP_BASE_URL')}/api/auth/activate?token=${rawToken}`;
    await this.enqueue({
      to: user.email,
      ...activationEmail(this.i18nService, lang, user, url),
    });
  }

  // Sent with no request from the guest to take a language from.
  async enqueueBookingRequestApprovalEmail(
    data: BookingRequestMailData,
  ): Promise<void> {
    await this.enqueue({
      to: data.user.email,
      ...bookingRequestApprovalEmail(this.i18nService, DEFAULT_LANGUAGE, data),
    });
  }

  async enqueueBookingRequestRejectionEmail(
    data: BookingRequestMailData,
    reason: string,
  ): Promise<void> {
    await this.enqueue({
      to: data.user.email,
      ...bookingRequestRejectionEmail(
        this.i18nService,
        DEFAULT_LANGUAGE,
        data,
        reason,
      ),
    });
  }

  async enqueueBookingRequestExpirationEmail(
    data: BookingRequestMailData,
  ): Promise<void> {
    await this.enqueue({
      to: data.user.email,
      ...bookingRequestExpirationEmail(
        this.i18nService,
        DEFAULT_LANGUAGE,
        data,
      ),
    });
  }
}
