import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../../common/api-docs/api-error-response.decorator.js';
import { API_TAGS } from '../../common/api-docs/api-tags.constants.js';
import { RespondsWith } from '../../common/api-docs/responds-with.decorator.js';
import { reviewIdParamSchema } from '../schemas/admin-review.schema.js';
import { AdminReviewRejectionService } from './admin-review-rejection.service.js';
import {
  createReviewRejectionBodySchema,
  reviewRejectionResponseSchema,
} from './schemas/review-rejection.schema.js';

import type { User } from '../../users/entities/user.entity.js';
import type {
  CreateReviewRejectionBody,
  ReviewRejectionResponse,
} from './schemas/review-rejection.schema.js';

@ApiBearerAuth()
@Roles('admin')
@ApiErrorResponse(403, 'Forbidden')
@ApiTags(API_TAGS.adminReviews)
@Controller('admin/reviews/:id/rejection')
export class AdminReviewRejectionController {
  constructor(
    private readonly adminReviewRejectionService: AdminReviewRejectionService,
  ) {}

  @Post()
  @RespondsWith(reviewRejectionResponseSchema, {
    status: 201,
    description: 'Review rejected, with the reason shown to the guest',
  })
  @ApiErrorResponse(404, 'Review not found')
  @ApiErrorResponse(409, 'Review is not pending')
  create(
    @CurrentUser() admin: User,
    @Param('id', { schema: reviewIdParamSchema }) id: number,
    @Body({ schema: createReviewRejectionBodySchema })
    body: CreateReviewRejectionBody,
  ): Promise<ReviewRejectionResponse> {
    return this.adminReviewRejectionService.reject(admin, id, body);
  }
}
