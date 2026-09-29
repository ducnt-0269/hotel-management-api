import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { hotelToday } from '../booking-requests/booking-request-dates.js';
import { BookingRequest } from '../booking-requests/entities/booking-request.entity.js';
import { isUniqueViolation } from '../database/is-unique-violation.js';
import { Payment } from '../payment-sessions/payment/entities/payment.entity.js';
import { Review } from './entities/review.entity.js';
import { findReviewRejections } from './review-outcomes.js';
import { reviewResponseColumns, toReviewResponse } from './review.mapper.js';

import type { User } from '../users/entities/user.entity.js';
import type {
  CreateReviewBody,
  ReviewResponse,
} from './schemas/review.schema.js';

// No transaction or lock: once a booking is reviewable it stays so (approved
// is final, a payment is never removed), and the UNIQUE on booking_request_id
// settles two concurrent submissions.
@Injectable()
export class BookingRequestReviewService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async create(
    user: User,
    id: number,
    body: CreateReviewBody,
  ): Promise<ReviewResponse> {
    const bookingRequest = await this.findOwnBookingRequest(user, id);
    await this.assertReviewable(bookingRequest);

    try {
      const review = await this.dataSource.manager.save(Review, {
        bookingRequestId: bookingRequest.id,
        rating: body.rating,
        comment: body.comment,
        status: 'pending',
      });
      return toReviewResponse(review, Number(bookingRequest.roomTypeId));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Booking request already has a review');
      }
      throw error;
    }
  }

  async findOwn(user: User, id: number): Promise<ReviewResponse> {
    const bookingRequest = await this.findOwnBookingRequest(user, id);
    const review = await this.dataSource.manager.findOne(Review, {
      select: reviewResponseColumns,
      where: { bookingRequestId: bookingRequest.id },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    const rejections = await findReviewRejections(this.dataSource.manager, [
      review.id,
    ]);
    return toReviewResponse(
      review,
      Number(bookingRequest.roomTypeId),
      rejections,
    );
  }

  private async assertReviewable(
    bookingRequest: Pick<BookingRequest, 'id' | 'status' | 'checkOutDate'>,
  ): Promise<void> {
    if (bookingRequest.status !== 'approved') {
      throw new ConflictException('Booking request is not approved');
    }
    const paid = await this.dataSource.manager.existsBy(Payment, {
      bookingRequestId: bookingRequest.id,
    });
    if (!paid) {
      throw new ConflictException('Booking request is not paid');
    }
    // ISO dates sort the same as strings and as days, so this compare is exact.
    if (hotelToday() < bookingRequest.checkOutDate) {
      throw new ConflictException('Stay has not ended');
    }
  }

  // Someone else's request is a 404, not a 403: its existence stays private.
  private async findOwnBookingRequest(
    user: User,
    id: number,
  ): Promise<BookingRequest> {
    const bookingRequest = await this.dataSource.manager.findOne(
      BookingRequest,
      {
        select: {
          id: true,
          status: true,
          checkOutDate: true,
          roomTypeId: true,
        },
        where: { id: String(id), userId: user.id },
      },
    );
    if (!bookingRequest) {
      throw new NotFoundException('Booking request not found');
    }
    return bookingRequest;
  }
}
