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

import type { ReviewStatus } from '../../reviews/entities/review.entity.js';
import type { DurationLike } from 'luxon';
import type { DataSource, EntityManager } from 'typeorm';

// Reproducible demo data, like the booking requests it reviews. A different
// seed from theirs, so the two draws do not mirror each other.
const FAKER_SEED = 20260930;

// Share of paid, ended stays that end up with a review at all.
const REVIEW_SHARE = 0.6;

// A guest reviews within this many days of checking out; the admin
// moderates a day later. Both stay in the past.
const REVIEWED_WITHIN_DAYS = 10;
const MODERATED_AFTER: DurationLike = { days: 1 };

// Most demo reviews are already moderated so admin lists show history; a
// few stay pending to exercise the moderation queue.
const REVIEW_STATUS_WEIGHTS = [
  { value: 'approved', weight: 0.7 },
  { value: 'rejected', weight: 0.15 },
  { value: 'pending', weight: 0.15 },
] as const;

// Guest ratings skew positive, as real hotel reviews tend to.
const RATING_WEIGHTS = [
  { value: 3, weight: 0.1 },
  { value: 4, weight: 0.35 },
  { value: 5, weight: 0.55 },
] as const;

const REVIEW_COMMENTS = [
  'Clean room, friendly staff — would book again.',
  'Great location and breakfast, though the room was a bit noisy at night.',
  'Comfortable bed and the view matched the photos on the website.',
  'Fast check-in, good value for the price.',
  'Spacious and quiet, exactly what we needed for a short trip.',
] as const;

const REVIEW_REJECTION_REASONS = [
  'Comment contains unrelated promotional content',
  'Content violates the review guidelines',
  'Unable to verify the guest actually stayed at the hotel',
] as const;

type EligibleStay = Pick<BookingRequest, 'id' | 'checkOutDate'>;

// Guarded on the whole table: it runs once against an empty database, in a
// single transaction, so a failed run leaves nothing behind to skip over.
export async function seedReviews(dataSource: DataSource): Promise<void> {
  if (await dataSource.getRepository(Review).exists()) {
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
  const now = DateTime.now();
  const selected = faker.helpers.arrayElements(
    eligible,
    Math.round(eligible.length * REVIEW_SHARE),
  );
  const seeded: Record<ReviewStatus, number> = {
    approved: 0,
    rejected: 0,
    pending: 0,
  };

  await dataSource.transaction(async (manager) => {
    for (const stay of selected) {
      const status = faker.helpers.weightedArrayElement(REVIEW_STATUS_WEIGHTS);
      await insertReview(manager, stay, status, admin.id, now);
      seeded[status] += 1;
    }
  });

  console.log(
    `reviews: ${selected.length} seeded of ${eligible.length} eligible stays ` +
      `(approved ${seeded.approved}, rejected ${seeded.rejected}, pending ${seeded.pending})`,
  );
}

// Paid, ended stays: the only bookings a guest is allowed to review. Ordered,
// so the seeded draw picks the same stays on every run.
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
    order: { id: 'ASC' },
  });
}

// Writes the review with its final status plus the moderation row that
// status is a projection of.
async function insertReview(
  manager: EntityManager,
  stay: EligibleStay,
  status: ReviewStatus,
  adminUserId: string,
  now: DateTime,
): Promise<void> {
  const checkedOut = DateTime.fromISO(stay.checkOutDate, {
    zone: HOTEL_TIME_ZONE,
  }).startOf('day');
  const latest = DateTime.min(
    checkedOut.plus({ days: REVIEWED_WITHIN_DAYS }),
    now.minus(MODERATED_AFTER),
  )!;
  const createdAt = faker.date.between({
    from: checkedOut.toJSDate(),
    to: latest.toJSDate(),
  });
  const moderatedAt = DateTime.fromJSDate(createdAt)
    .plus(MODERATED_AFTER)
    .toJSDate();

  const review = await manager.save(
    manager.create(Review, {
      bookingRequestId: stay.id,
      rating: faker.helpers.weightedArrayElement(RATING_WEIGHTS),
      comment: faker.helpers.arrayElement(REVIEW_COMMENTS),
      status,
      createdAt,
      updatedAt: status === 'pending' ? createdAt : moderatedAt,
    }),
  );

  if (status === 'approved') {
    await manager.insert(ReviewApproval, {
      reviewId: review.id,
      adminUserId,
      createdAt: moderatedAt,
    });
  }
  if (status === 'rejected') {
    await manager.insert(ReviewRejection, {
      reviewId: review.id,
      adminUserId,
      reason: faker.helpers.arrayElement(REVIEW_REJECTION_REASONS),
      createdAt: moderatedAt,
    });
  }
}
