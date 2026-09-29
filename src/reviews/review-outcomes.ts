import { In } from 'typeorm';

import { ReviewRejection } from './rejection/entities/review-rejection.entity.js';

import type { EntityManager } from 'typeorm';

// Rejection rows for a page of reviews, one query. At most one row per review
// (UNIQUE on review_id).
export function findReviewRejections(
  manager: EntityManager,
  reviewIds: string[],
): Promise<ReviewRejection[]> {
  if (reviewIds.length === 0) return Promise.resolve([]);
  return manager.find(ReviewRejection, {
    select: { reviewId: true, reason: true, createdAt: true },
    where: { reviewId: In(reviewIds) },
  });
}
