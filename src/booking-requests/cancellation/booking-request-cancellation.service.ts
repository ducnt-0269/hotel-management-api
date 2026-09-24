import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { BookingRequest } from '../entities/booking-request.entity.js';
import { toBookingRequestCancellationResponse } from './booking-request-cancellation.mapper.js';
import { BookingRequestCancellation } from './entities/booking-request-cancellation.entity.js';

import type { User } from '../../users/entities/user.entity.js';
import type { BookingRequestCancellationResponse } from './schemas/booking-request-cancellation.schema.js';

@Injectable()
export class BookingRequestCancellationService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async cancel(
    user: User,
    id: number,
  ): Promise<BookingRequestCancellationResponse> {
    return this.dataSource.transaction(async (manager) => {
      const bookingRequest = await manager.findOneBy(BookingRequest, {
        id: String(id),
        userId: user.id,
      });
      // Someone else's request is a 404, not a 403: its existence stays private.
      if (!bookingRequest) {
        throw new NotFoundException('Booking request not found');
      }
      // Expiry is the sweep's to record: a hold it has not reached yet is
      // still pending and can be cancelled.
      if (bookingRequest.status !== 'pending') {
        throw new ConflictException('Booking request is not pending');
      }

      // Only while still pending: a sweep or approval that got there first
      // leaves nothing to update, instead of being overwritten.
      const { affected } = await manager.update(
        BookingRequest,
        { id: bookingRequest.id, status: 'pending' },
        { status: 'cancelled' },
      );
      if (affected !== 1) {
        throw new ConflictException('Booking request is not pending');
      }
      const cancellation = await manager.save(BookingRequestCancellation, {
        bookingRequestId: bookingRequest.id,
      });
      return toBookingRequestCancellationResponse(cancellation);
    });
  }
}
