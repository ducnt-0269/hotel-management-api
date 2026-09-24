import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MoreThan } from 'typeorm';

import { BookingRequest } from '../entities/booking-request.entity.js';
import { toBookingRequestCancellationResponse } from './booking-request-cancellation.mapper.js';
import { BookingRequestCancellation } from './entities/booking-request-cancellation.entity.js';

import type { User } from '../../users/entities/user.entity.js';
import type { BookingRequestCancellationResponse } from './schemas/booking-request-cancellation.schema.js';

@Injectable()
export class BookingRequestCancellationService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // The guarded UPDATE runs first, as in the expiration sweep, but narrowed to
  // this guest's one request: a racing cancel, sweep or approval blocks on the
  // row lock, then finds it no longer pending. A hold past `expiresAt` already
  // counts as expired, even before the sweep records it.
  async cancel(
    user: User,
    id: number,
  ): Promise<BookingRequestCancellationResponse> {
    return this.dataSource.transaction(async (manager) => {
      const where = { id: String(id), userId: user.id };
      const { raw } = await manager
        .createQueryBuilder()
        .update(BookingRequest)
        .set({ status: 'cancelled' })
        .where({ ...where, status: 'pending' })
        .andWhere({ expiresAt: MoreThan(new Date()) })
        .returning('id')
        .execute();

      if ((raw as unknown[]).length === 0) {
        // Unlocked read: safe because booking requests are never deleted.
        // Someone else's request is a 404, not a 403: its existence stays
        // private.
        if (!(await manager.existsBy(BookingRequest, where))) {
          throw new NotFoundException('Booking request not found');
        }
        throw new ConflictException('Booking request is not pending');
      }

      const cancellation = await manager.save(BookingRequestCancellation, {
        bookingRequestId: String(id),
      });
      return toBookingRequestCancellationResponse(cancellation);
    });
  }
}
