import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookingRequestReviewController } from './booking-request-review.controller.js';
import { BookingRequestReviewService } from './booking-request-review.service.js';
import { Review } from './entities/review.entity.js';
import { RoomTypeReviewController } from './room-type-review.controller.js';
import { RoomTypeReviewService } from './room-type-review.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Review])],
  controllers: [BookingRequestReviewController, RoomTypeReviewController],
  providers: [BookingRequestReviewService, RoomTypeReviewService],
})
export class ReviewsModule {}
