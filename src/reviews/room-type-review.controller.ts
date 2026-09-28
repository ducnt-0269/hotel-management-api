import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator.js';
import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import { API_TAGS } from '../common/api-docs/api-tags.constants.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
import { paginationQuerySchema } from '../common/pagination/pagination.schema.js';
import { roomTypeIdParamSchema } from '../room-types/schemas/room-type.schema.js';
import { RoomTypeReviewService } from './room-type-review.service.js';
import { reviewListResponseSchema } from './schemas/review.schema.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type { PaginationQuery } from '../common/pagination/pagination.schema.js';
import type { ReviewResponse } from './schemas/review.schema.js';

@Public()
@ApiTags(API_TAGS.roomTypes)
@Controller('room-types/:id/reviews')
export class RoomTypeReviewController {
  constructor(private readonly roomTypeReviewService: RoomTypeReviewService) {}

  @Get()
  @RespondsWith(reviewListResponseSchema, {
    status: 200,
    description: 'Approved reviews for this room type, newest first',
  })
  @ApiErrorResponse(404, 'Room type not found')
  list(
    @Param('id', { schema: roomTypeIdParamSchema }) id: number,
    @Query({ schema: paginationQuerySchema }) query: PaginationQuery,
  ): Promise<Paginated<ReviewResponse>> {
    return this.roomTypeReviewService.list(id, query);
  }
}
