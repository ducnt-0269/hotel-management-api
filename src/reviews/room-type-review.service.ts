import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { paginate, toSkipTake } from '../common/pagination/paginate.js';
import { RoomType } from '../room-types/entities/room-type.entity.js';
import { Review } from './entities/review.entity.js';
import { reviewResponseColumns, toReviewResponse } from './review.mapper.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type { PaginationQuery } from '../common/pagination/pagination.schema.js';
import type { ReviewResponse } from './schemas/review.schema.js';

@Injectable()
export class RoomTypeReviewService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(
    roomTypeId: number,
    query: PaginationQuery,
  ): Promise<Paginated<ReviewResponse>> {
    const exists = await this.dataSource.manager.existsBy(RoomType, {
      id: String(roomTypeId),
    });
    if (!exists) {
      throw new NotFoundException('Room type not found');
    }

    // No `room_type_id` column on `reviews`: the room type is derived from
    // the booking, so the filter joins `booking_requests` instead.
    // Approved reviews have no rejection, so it is not joined.
    const [rows, total] = await this.dataSource.manager.findAndCount(Review, {
      select: reviewResponseColumns,
      where: {
        status: 'approved',
        bookingRequest: { roomTypeId: String(roomTypeId) },
      },
      order: { createdAt: 'DESC', id: 'DESC' },
      ...toSkipTake(query),
    });

    return paginate(
      rows.map((review) => toReviewResponse(review, roomTypeId)),
      total,
      query,
    );
  }
}
