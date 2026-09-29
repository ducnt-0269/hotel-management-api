import { DataSource } from 'typeorm';

import { Review } from '../../../src/reviews/entities/review.entity.js';

import type { BookingRequest } from '../../../src/booking-requests/entities/booking-request.entity.js';
import type { ReviewStatus } from '../../../src/reviews/entities/review.entity.js';
import type { INestApplication } from '@nestjs/common';

export interface ReviewAttributes {
  bookingRequest: BookingRequest;
  rating?: number;
  comment?: string;
  status?: ReviewStatus;
  createdAt?: Date;
}

// Inserts a review directly, bypassing the create endpoint's eligibility
// checks, so a spec can stage any status without going through moderation.
export async function createReview(
  app: INestApplication,
  attributes: ReviewAttributes,
): Promise<Review> {
  const reviews = app.get(DataSource).getRepository(Review);

  return reviews.save(
    reviews.create({
      bookingRequestId: attributes.bookingRequest.id,
      rating: attributes.rating ?? 5,
      comment: attributes.comment ?? 'Great stay, would come back.',
      status: attributes.status ?? 'pending',
      ...(attributes.createdAt && { createdAt: attributes.createdAt }),
    }),
  );
}
