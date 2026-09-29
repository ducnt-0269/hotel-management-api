import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Review } from '../entities/review.entity.js';
import { ReviewRejection } from './entities/review-rejection.entity.js';
import { toReviewRejectionResponse } from './review-rejection.mapper.js';

import type { User } from '../../users/entities/user.entity.js';
import type {
  CreateReviewRejectionBody,
  ReviewRejectionResponse,
} from './schemas/review-rejection.schema.js';

@Injectable()
export class AdminReviewRejectionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async reject(
    admin: User,
    id: number,
    body: CreateReviewRejectionBody,
  ): Promise<ReviewRejectionResponse> {
    return this.dataSource.transaction(async (manager) => {
      const review = await manager.findOne(Review, {
        select: { id: true, status: true },
        where: { id: String(id) },
      });
      if (!review) {
        throw new NotFoundException('Review not found');
      }
      if (review.status !== 'pending') {
        throw new ConflictException('Review is not pending');
      }

      // Only while still pending: an approval that got there first leaves
      // nothing to update, instead of being overwritten.
      const { affected } = await manager.update(
        Review,
        { id: review.id, status: 'pending' },
        { status: 'rejected' },
      );
      if (affected !== 1) {
        throw new ConflictException('Review is not pending');
      }
      const rejection = await manager.save(ReviewRejection, {
        reviewId: review.id,
        adminUserId: admin.id,
        reason: body.reason,
      });
      return toReviewRejectionResponse(rejection);
    });
  }
}
