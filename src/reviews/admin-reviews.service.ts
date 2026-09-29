import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { paginate, toSkipTake } from '../common/pagination/paginate.js';
import {
  adminReviewResponseColumns,
  toAdminReviewResponse,
} from './admin-review.mapper.js';
import { Review } from './entities/review.entity.js';
import { findReviewRejections } from './review-outcomes.js';

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
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
  ) {}

  async list(query: ListReviewsQuery): Promise<Paginated<AdminReviewResponse>> {
    const [rows, total] = await this.reviewsRepository.findAndCount({
      select: adminReviewResponseColumns,
      where: { status: query.status },
      relations: { bookingRequest: { user: true } },
      order: { createdAt: 'ASC', id: 'ASC' },
      ...toSkipTake(query),
    });
    const rejections = await findReviewRejections(
      this.dataSource.manager,
      rows.map((row) => row.id),
    );
    return paginate(
      rows.map((row) =>
        toAdminReviewResponse(
          row,
          Number(row.bookingRequest.roomTypeId),
          row.bookingRequest.user,
          rejections,
        ),
      ),
      total,
      query,
    );
  }
}
