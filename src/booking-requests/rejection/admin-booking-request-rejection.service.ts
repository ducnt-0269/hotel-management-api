import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { BookingRequest } from '../entities/booking-request.entity.js';
import { toBookingRequestRejectionResponse } from './booking-request-rejection.mapper.js';
import { BookingRequestRejection } from './entities/booking-request-rejection.entity.js';

import type { User } from '../../users/entities/user.entity.js';
import type {
  BookingRequestRejectionResponse,
  CreateBookingRequestRejectionBody,
} from './schemas/booking-request-rejection.schema.js';

@Injectable()
export class AdminBookingRequestRejectionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async reject(
    admin: User,
    id: number,
    body: CreateBookingRequestRejectionBody,
  ): Promise<BookingRequestRejectionResponse> {
    return this.dataSource.transaction(async (manager) => {
      const bookingRequest = await manager.findOne(BookingRequest, {
        select: { id: true, status: true },
        where: { id: String(id) },
      });
      if (!bookingRequest) {
        throw new NotFoundException('Booking request not found');
      }
      if (bookingRequest.status !== 'pending') {
        throw new ConflictException('Booking request is not pending');
      }
      // No expiry check, unlike approval: an overdue hold's rooms are already
      // free, so rejecting it takes nothing from anyone.

      // Only while still pending: a sweep or cancellation that got there
      // first leaves nothing to update, instead of being overwritten.
      const { affected } = await manager.update(
        BookingRequest,
        { id: bookingRequest.id, status: 'pending' },
        { status: 'rejected' },
      );
      if (affected !== 1) {
        throw new ConflictException('Booking request is not pending');
      }
      const rejection = await manager.save(BookingRequestRejection, {
        bookingRequestId: bookingRequest.id,
        adminUserId: admin.id,
        reason: body.reason,
      });
      return toBookingRequestRejectionResponse(rejection);
    });
  }
}
