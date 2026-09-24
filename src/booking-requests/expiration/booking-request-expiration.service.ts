import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, LessThan } from 'typeorm';

import { BookingRequest } from '../entities/booking-request.entity.js';
import { BookingRequestExpiration } from './entities/booking-request-expiration.entity.js';

// Records the expiry of pending requests nobody decided on in time. Their rooms
// are already free once `expires_at` passes (the capacity check ignores them),
// so this only brings `status` and the outcome table in line and can run
// every half hour.
@Injectable()
export class BookingRequestExpirationService {
  private readonly logger = new Logger(BookingRequestExpirationService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async sweep(): Promise<void> {
    try {
      const expired = await this.expireOverdue();
      if (expired > 0) this.logger.log(`Expired ${expired} booking request(s)`);
    } catch (error) {
      this.logger.error('Hold expiry sweep failed', error);
    }
  }

  // The guarded UPDATE runs first so an overlapping sweep blocks on the row
  // locks and then finds the rows no longer pending, instead of racing into
  // the UNIQUE on booking_request_expirations. One transaction: status never
  // moves without its outcome row.
  async expireOverdue(): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const { raw } = await manager
        .createQueryBuilder()
        .update(BookingRequest)
        .set({ status: 'expired' })
        .where({ status: 'pending' })
        .andWhere({ expiresAt: LessThan(new Date()) })
        .returning('id')
        .execute();
      const ids = (raw as { id: string }[]).map((row) => row.id);

      if (ids.length > 0) {
        await manager.insert(
          BookingRequestExpiration,
          ids.map((bookingRequestId) => ({ bookingRequestId })),
        );
      }
      return ids.length;
    });
  }
}
