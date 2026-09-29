import { Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../../common/api-docs/api-error-response.decorator.js';
import { API_TAGS } from '../../common/api-docs/api-tags.constants.js';
import { RespondsWith } from '../../common/api-docs/responds-with.decorator.js';
import { reviewIdParamSchema } from '../schemas/admin-review.schema.js';
import { AdminReviewApprovalService } from './admin-review-approval.service.js';
import { reviewApprovalResponseSchema } from './schemas/review-approval.schema.js';

import type { User } from '../../users/entities/user.entity.js';
import type { ReviewApprovalResponse } from './schemas/review-approval.schema.js';

@ApiBearerAuth()
@Roles('admin')
@ApiErrorResponse(403, 'Forbidden')
@ApiTags(API_TAGS.adminReviews)
@Controller('admin/reviews/:id/approval')
export class AdminReviewApprovalController {
  constructor(
    private readonly adminReviewApprovalService: AdminReviewApprovalService,
  ) {}

  @Post()
  @RespondsWith(reviewApprovalResponseSchema, {
    status: 201,
    description: 'Review approved; it now shows on the room type',
  })
  @ApiErrorResponse(404, 'Review not found')
  @ApiErrorResponse(409, 'Review is not pending')
  create(
    @CurrentUser() admin: User,
    @Param('id', { schema: reviewIdParamSchema }) id: number,
  ): Promise<ReviewApprovalResponse> {
    return this.adminReviewApprovalService.approve(admin, id);
  }
}
