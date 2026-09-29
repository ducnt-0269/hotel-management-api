import type { ReviewApproval } from './entities/review-approval.entity.js';
import type { ReviewApprovalResponse } from './schemas/review-approval.schema.js';

export function toReviewApprovalResponse(
  approval: ReviewApproval,
): ReviewApprovalResponse {
  return {
    reviewId: Number(approval.reviewId),
    adminUserId: Number(approval.adminUserId),
    createdAt: approval.createdAt,
  };
}
