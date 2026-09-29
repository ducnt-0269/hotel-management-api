import { DataSource } from 'typeorm';

import { Review } from '../../../src/reviews/entities/review.entity.js';
import { ReviewRejection } from '../../../src/reviews/rejection/entities/review-rejection.entity.js';

import type { BookingRequest } from '../../../src/booking-requests/entities/booking-request.entity.js';
import type { ReviewStatus } from '../../../src/reviews/entities/review.entity.js';
import type { User } from '../../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

export interface ReviewAttributes {
  bookingRequest: BookingRequest;
  rating?: number;
  comment?: string;
  // A rejected review needs its rejection row: use `createRejectedReview`.
  status?: Exclude<ReviewStatus, 'rejected'>;
  createdAt?: Date;
}

// Inserts a review directly, bypassing the create endpoint's eligibility
// checks, so a spec can stage any status without going through moderation.
export function createReview(
  app: INestApplication,
  attributes: ReviewAttributes,
): Promise<Review> {
  return saveReview(app, attributes, attributes.status ?? 'pending');
}

// A rejected review with its rejection row, as moderation leaves it.
export async function createRejectedReview(
  app: INestApplication,
  attributes: Omit<ReviewAttributes, 'status'> & {
    admin: User;
    reason?: string;
  },
): Promise<Review> {
  const review = await saveReview(app, attributes, 'rejected');
  await app
    .get(DataSource)
    .getRepository(ReviewRejection)
    .save({
      reviewId: review.id,
      adminUserId: attributes.admin.id,
      reason: attributes.reason ?? 'Comment breaches the review guidelines',
    });
  return review;
}

function saveReview(
  app: INestApplication,
  attributes: Omit<ReviewAttributes, 'status'>,
  status: ReviewStatus,
): Promise<Review> {
  const reviews = app.get(DataSource).getRepository(Review);

  return reviews.save(
    reviews.create({
      bookingRequestId: attributes.bookingRequest.id,
      rating: attributes.rating ?? 5,
      comment: attributes.comment ?? 'Great stay, would come back.',
      status,
      ...(attributes.createdAt && { createdAt: attributes.createdAt }),
    }),
  );
}
