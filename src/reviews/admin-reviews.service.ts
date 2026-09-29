import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { paginate, toSkipTake } from '../common/pagination/paginate.js';
import {
  adminReviewResponseColumns,
  toAdminReviewResponse,
} from './admin-review.mapper.js';
import { Review } from './entities/review.entity.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type {
  AdminReviewResponse,
  ListReviewsQuery,
} from './schemas/admin-review.schema.js';

// An admin looks reviews up. Deciding on them lives in approval/ and
// rejection/.
@Injectable()
export class AdminReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
  ) {}

  async list(query: ListReviewsQuery): Promise<Paginated<AdminReviewResponse>> {
    const [rows, total] = await this.reviewsRepository.findAndCount({
      select: adminReviewResponseColumns,
      where: { ...(query.status && { status: query.status }) },
      relations: { bookingRequest: { user: true }, rejection: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      ...toSkipTake(query),
    });
    return paginate(
      rows.map((row) =>
        toAdminReviewResponse(
          row,
          Number(row.bookingRequest.roomTypeId),
          row.bookingRequest.user,
        ),
      ),
      total,
      query,
    );
  }
}
