import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Review } from '../entities/review.entity.js';
import { ReviewApproval } from './entities/review-approval.entity.js';
import { toReviewApprovalResponse } from './review-approval.mapper.js';

import type { User } from '../../users/entities/user.entity.js';
import type { ReviewApprovalResponse } from './schemas/review-approval.schema.js';

@Injectable()
export class AdminReviewApprovalService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async approve(admin: User, id: number): Promise<ReviewApprovalResponse> {
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

      // Only while still pending: a rejection that got there first leaves
      // nothing to update, instead of being overwritten.
      const { affected } = await manager.update(
        Review,
        { id: review.id, status: 'pending' },
        { status: 'approved' },
      );
      if (affected !== 1) {
        throw new ConflictException('Review is not pending');
      }
      const approval = await manager.save(ReviewApproval, {
        reviewId: review.id,
        adminUserId: admin.id,
      });
      return toReviewApprovalResponse(approval);
    });
  }
}
