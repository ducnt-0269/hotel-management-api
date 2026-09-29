import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminReviewsController } from './admin-reviews.controller.js';
import { AdminReviewsService } from './admin-reviews.service.js';
import { AdminReviewApprovalController } from './approval/admin-review-approval.controller.js';
import { AdminReviewApprovalService } from './approval/admin-review-approval.service.js';
import { ReviewApproval } from './approval/entities/review-approval.entity.js';
import { BookingRequestReviewController } from './booking-request-review.controller.js';
import { BookingRequestReviewService } from './booking-request-review.service.js';
import { Review } from './entities/review.entity.js';
import { AdminReviewRejectionController } from './rejection/admin-review-rejection.controller.js';
import { AdminReviewRejectionService } from './rejection/admin-review-rejection.service.js';
import { ReviewRejection } from './rejection/entities/review-rejection.entity.js';
import { RoomTypeReviewController } from './room-type-review.controller.js';
import { RoomTypeReviewService } from './room-type-review.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, ReviewApproval, ReviewRejection]),
  ],
  controllers: [
    BookingRequestReviewController,
    RoomTypeReviewController,
    AdminReviewsController,
    AdminReviewApprovalController,
    AdminReviewRejectionController,
  ],
  providers: [
    BookingRequestReviewService,
    RoomTypeReviewService,
    AdminReviewsService,
    AdminReviewApprovalService,
    AdminReviewRejectionService,
  ],
})
export class ReviewsModule {}
