import type { ReviewRejection } from './entities/review-rejection.entity.js';
import type { ReviewRejectionResponse } from './schemas/review-rejection.schema.js';

export function toReviewRejectionResponse(
  rejection: ReviewRejection,
): ReviewRejectionResponse {
  return {
    reviewId: Number(rejection.reviewId),
    adminUserId: Number(rejection.adminUserId),
    reason: rejection.reason,
    createdAt: rejection.createdAt,
  };
}
