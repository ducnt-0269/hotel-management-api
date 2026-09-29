import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import { API_TAGS } from '../common/api-docs/api-tags.constants.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
import { AdminReviewsService } from './admin-reviews.service.js';
import {
  adminReviewListResponseSchema,
  listReviewsQuerySchema,
} from './schemas/admin-review.schema.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type {
  AdminReviewResponse,
  ListReviewsQuery,
} from './schemas/admin-review.schema.js';

@ApiBearerAuth()
@Roles('admin')
@ApiErrorResponse(403, 'Forbidden')
@ApiTags(API_TAGS.adminReviews)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly adminReviewsService: AdminReviewsService) {}

  @Get()
  @RespondsWith(adminReviewListResponseSchema, {
    status: 200,
    description: 'The moderation queue, oldest first',
  })
  list(
    @Query({ schema: listReviewsQuerySchema }) query: ListReviewsQuery,
  ): Promise<Paginated<AdminReviewResponse>> {
    return this.adminReviewsService.list(query);
  }
}
