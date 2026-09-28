import type { Review } from './entities/review.entity.js';
import type { ReviewResponse } from './schemas/review.schema.js';
import type { FindOptionsSelect } from 'typeorm';

// Exactly the columns `toReviewResponse` reads off `Review` itself; the room
// type id comes from the booking, not the review row.
export const reviewResponseColumns: FindOptionsSelect<Review> = {
  id: true,
  bookingRequestId: true,
  rating: true,
  comment: true,
  status: true,
  createdAt: true,
};

// bigint ids arrive from the driver as strings; `Number` is exact for them,
// as they stay far below 2^53.
export function toReviewResponse(
  review: Review,
  roomTypeId: number,
): ReviewResponse {
  return {
    id: Number(review.id),
    bookingRequestId: Number(review.bookingRequestId),
    roomTypeId,
    rating: review.rating,
    comment: review.comment,
    status: review.status,
    createdAt: review.createdAt,
  };
}
