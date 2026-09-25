import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, LessThan, MoreThan } from 'typeorm';

import { MailService } from '../../mail/mail.service.js';
import { BOOKING_REQUEST_MAIL_SELECT } from '../booking-request-mail-data.js';
import { BookingRequest } from '../entities/booking-request.entity.js';
import { BookingRequestExpiration } from './entities/booking-request-expiration.entity.js';

import type { BookingRequestMailData } from '../booking-request-mail-data.js';

const EXPIRATION_BATCH_SIZE = 100;

// Records the expiry of pending requests nobody decided on in time. Their rooms
// are already free once `expires_at` passes (the capacity check ignores them),
// so this only brings `status` and the outcome table in line and can run
// every half hour.
@Injectable()
export class BookingRequestExpirationService {
  private readonly logger = new Logger(BookingRequestExpirationService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async sweep(): Promise<void> {
    try {
      const expired = await this.expireOverdue();
      if (expired > 0) this.logger.log(`Expired ${expired} booking request(s)`);
    } catch (error) {
      this.logger.error('Hold expiry sweep failed', error);
    }
  }

  // Walks the overdue holds 100 at a time by id, like find_each, so the mail
  // data held in memory and the rows each transaction locks stay bounded
  // however many are overdue. The batch is loaded before its transaction
  // commits: a failed load leaves the holds pending for the next sweep instead
  // of expiring them unmailed.
  async expireOverdue(): Promise<number> {
    let expired = 0;
    let afterId = '0';
    for (;;) {
      const overdue = await this.dataSource.getRepository(BookingRequest).find({
        select: BOOKING_REQUEST_MAIL_SELECT,
        relations: { user: true, roomType: true },
        where: {
          status: 'pending',
          expiresAt: LessThan(new Date()),
          id: MoreThan(afterId),
        },
        order: { id: 'ASC' },
        take: EXPIRATION_BATCH_SIZE,
      });

      const batch = await this.expire(overdue);
      // Mailed after the commit so a rolled-back batch never mails.
      for (const bookingRequest of batch) {
        await this.mailService.enqueueBookingRequestExpirationEmail(
          bookingRequest,
        );
      }
      expired += batch.length;

      if (overdue.length < EXPIRATION_BATCH_SIZE) return expired;
      afterId = overdue[overdue.length - 1].id;
    }
  }

  // The UPDATE stays guarded on `pending`: a request cancelled since it was
  // read, or expired by an overlapping sweep that blocked on its lock, is left
  // out rather than racing into the UNIQUE on booking_request_expirations.
  // Returns only the requests this call expired. One transaction: status
  // never moves without its outcome row.
  private async expire(
    overdue: BookingRequestMailData[],
  ): Promise<BookingRequestMailData[]> {
    if (overdue.length === 0) return [];

    return this.dataSource.transaction(async (manager) => {
      const { raw } = await manager
        .createQueryBuilder()
        .update(BookingRequest)
        .set({ status: 'expired' })
        .where({ id: In(overdue.map((bookingRequest) => bookingRequest.id)) })
        .andWhere({ status: 'pending' })
        .returning('id')
        .execute();
      const ids = new Set((raw as { id: string }[]).map((row) => row.id));
      if (ids.size === 0) return [];

      await manager.insert(
        BookingRequestExpiration,
        [...ids].map((bookingRequestId) => ({ bookingRequestId })),
      );
      return overdue.filter((bookingRequest) => ids.has(bookingRequest.id));
    });
  }
}
