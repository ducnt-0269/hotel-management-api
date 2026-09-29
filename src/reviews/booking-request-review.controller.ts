import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { bookingRequestIdParamSchema } from '../booking-requests/schemas/booking-request.schema.js';
import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import { API_TAGS } from '../common/api-docs/api-tags.constants.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
import { BookingRequestReviewService } from './booking-request-review.service.js';
import {
  createReviewBodySchema,
  reviewResponseSchema,
} from './schemas/review.schema.js';

import type { User } from '../users/entities/user.entity.js';
import type {
  CreateReviewBody,
  ReviewResponse,
} from './schemas/review.schema.js';

@ApiBearerAuth()
@Roles('user')
@ApiErrorResponse(403, 'Forbidden')
@ApiTags(API_TAGS.bookingRequests)
@Controller('booking-requests/:id/review')
export class BookingRequestReviewController {
  constructor(
    private readonly bookingRequestReviewService: BookingRequestReviewService,
  ) {}

  @Post()
  @RespondsWith(reviewResponseSchema, {
    status: 201,
    description: 'Review recorded, pending admin approval',
  })
  @ApiErrorResponse(404, 'Booking request not found')
  @ApiErrorResponse(
    409,
    'Booking request is not approved, is not paid, its stay has not ended, or it already has a review',
  )
  create(
    @CurrentUser() user: User,
    @Param('id', { schema: bookingRequestIdParamSchema }) id: number,
    @Body({ schema: createReviewBodySchema }) body: CreateReviewBody,
  ): Promise<ReviewResponse> {
    return this.bookingRequestReviewService.create(user, id, body);
  }

  @Get()
  @RespondsWith(reviewResponseSchema, {
    status: 200,
    description: 'Your own review for this booking request',
  })
  @ApiErrorResponse(404, 'Booking request not found, or it has no review')
  findOwn(
    @CurrentUser() user: User,
    @Param('id', { schema: bookingRequestIdParamSchema }) id: number,
  ): Promise<ReviewResponse> {
    return this.bookingRequestReviewService.findOwn(user, id);
  }
}
