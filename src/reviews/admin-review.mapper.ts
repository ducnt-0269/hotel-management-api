import { reviewResponseColumns, toReviewResponse } from './review.mapper.js';

import type { User } from '../users/entities/user.entity.js';
import type { Review } from './entities/review.entity.js';
import type { ReviewRejection } from './rejection/entities/review-rejection.entity.js';
import type { AdminReviewResponse } from './schemas/admin-review.schema.js';
import type { FindOptionsSelect } from 'typeorm';

// Exactly the columns `toAdminReviewResponse` reads.
export const adminReviewResponseColumns: FindOptionsSelect<Review> = {
  ...reviewResponseColumns,
  bookingRequest: {
    id: true,
    roomTypeId: true,
    user: { id: true, email: true, fullName: true },
  },
};

export function toAdminReviewResponse(
  review: Review,
  roomTypeId: number,
  user: Pick<User, 'id' | 'email' | 'fullName'>,
  rejections: ReviewRejection[],
): AdminReviewResponse {
  return {
    ...toReviewResponse(review, roomTypeId, rejections),
    user: { id: Number(user.id), email: user.email, fullName: user.fullName },
  };
}
