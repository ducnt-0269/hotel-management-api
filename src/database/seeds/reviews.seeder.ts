import { faker } from '@faker-js/faker';
import { DateTime } from 'luxon';
import { In, LessThan } from 'typeorm';

import { hotelToday } from '../../booking-requests/booking-request-dates.js';
import { HOTEL_TIME_ZONE } from '../../booking-requests/booking-request.constants.js';
import { BookingRequest } from '../../booking-requests/entities/booking-request.entity.js';
import { Payment } from '../../payment-sessions/payment/entities/payment.entity.js';
import { ReviewApproval } from '../../reviews/approval/entities/review-approval.entity.js';
import { Review } from '../../reviews/entities/review.entity.js';
import { ReviewRejection } from '../../reviews/rejection/entities/review-rejection.entity.js';
import { User } from '../../users/entities/user.entity.js';
import {
  FAKER_SEED,
  RATING_WEIGHTS,
  REVIEW_COMMENTS,
  REVIEW_REJECTION_REASONS,
  REVIEW_SHARE,
  REVIEW_STATUS_WEIGHTS,
} from './review-seed.constants.js';
import { randomInstantBetween } from './seed-random-time.js';

import type { ReviewStatus } from '../../reviews/entities/review.entity.js';
import type { DataSource, EntityManager } from 'typeorm';

type EligibleStay = Pick<BookingRequest, 'id' | 'checkOutDate'>;

// Guarded on the whole table, not per row: this seeder only ever runs once
// against an empty database, and a second run must change nothing.
export async function seedReviews(dataSource: DataSource): Promise<void> {
  const reviews = dataSource.getRepository(Review);
  if (await reviews.exists()) {
    console.log('reviews: skipped (already seeded)');
    return;
  }

  const admin = await dataSource
    .getRepository(User)
    .findOne({ select: { id: true }, where: { role: 'admin' } });
  if (!admin) {
    throw new Error('reviews seeder needs the users seeder to run first');
  }

  const eligible = await findEligibleStays(dataSource);
  if (eligible.length === 0) {
    console.log('reviews: skipped (no paid, ended stays to review)');
    return;
  }

  faker.seed(FAKER_SEED);
  const now = new Date();
  const selected = faker.helpers.arrayElements(
    eligible,
    Math.round(eligible.length * REVIEW_SHARE),
  );

  const counts = { approved: 0, rejected: 0, pending: 0 };
  for (const stay of selected) {
    const status: ReviewStatus = faker.helpers.weightedArrayElement(
      REVIEW_STATUS_WEIGHTS,
    );
    await dataSource.transaction((manager) =>
      insertReview(manager, stay, status, admin.id, now),
    );
    counts[status] += 1;
  }

  console.log(
    `reviews: ${selected.length} seeded of ${eligible.length} eligible stays ` +
      `(approved ${counts.approved}, rejected ${counts.rejected}, pending ${counts.pending})`,
  );
}

// Paid, ended stays: the only bookings a guest is allowed to review.
async function findEligibleStays(
  dataSource: DataSource,
): Promise<EligibleStay[]> {
  const payments = await dataSource
    .getRepository(Payment)
    .find({ select: { bookingRequestId: true } });
  if (payments.length === 0) return [];

  return dataSource.getRepository(BookingRequest).find({
    select: { id: true, checkOutDate: true },
    where: {
      id: In(payments.map((payment) => payment.bookingRequestId)),
      status: 'approved',
      checkOutDate: LessThan(hotelToday()),
    },
  });
}

async function insertReview(
  manager: EntityManager,
  stay: EligibleStay,
  status: ReviewStatus,
  adminUserId: string,
  now: Date,
): Promise<void> {
  const checkOutStart = DateTime.fromISO(stay.checkOutDate, {
    zone: HOTEL_TIME_ZONE,
  }).startOf('day');
  const createdAt = randomInstantBetween(checkOutStart.toJSDate(), now);
  const updatedAt =
    status === 'pending' ? createdAt : randomInstantBetween(createdAt, now);

  const review = await manager.save(
    manager.create(Review, {
      bookingRequestId: stay.id,
      rating: faker.helpers.weightedArrayElement(RATING_WEIGHTS),
      comment: faker.helpers.arrayElement(REVIEW_COMMENTS),
      status,
      createdAt,
      updatedAt,
    }),
  );

  if (status === 'approved') {
    await manager.insert(ReviewApproval, {
      reviewId: review.id,
      adminUserId,
      createdAt: updatedAt,
    });
  }
  if (status === 'rejected') {
    await manager.insert(ReviewRejection, {
      reviewId: review.id,
      adminUserId,
      reason: faker.helpers.arrayElement(REVIEW_REJECTION_REASONS),
      createdAt: updatedAt,
    });
  }
}
