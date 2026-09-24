import { Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../../common/api-docs/api-error-response.decorator.js';
import { RespondsWith } from '../../common/api-docs/responds-with.decorator.js';
import { bookingRequestIdParamSchema } from '../schemas/booking-request.schema.js';
import { AdminBookingRequestApprovalService } from './admin-booking-request-approval.service.js';
import { bookingRequestApprovalResponseSchema } from './schemas/booking-request-approval.schema.js';

import type { User } from '../../users/entities/user.entity.js';
import type { BookingRequestApprovalResponse } from './schemas/booking-request-approval.schema.js';

@ApiBearerAuth()
@Roles('admin')
@ApiErrorResponse(403, 'Forbidden')
@Controller('admin/booking-requests/:id/approval')
export class AdminBookingRequestApprovalController {
  constructor(
    private readonly adminBookingRequestApprovalService: AdminBookingRequestApprovalService,
  ) {}

  @Post()
  @RespondsWith(bookingRequestApprovalResponseSchema, {
    status: 201,
    description: 'Request approved; its rooms stay held',
  })
  @ApiErrorResponse(404, 'Booking request not found')
  @ApiErrorResponse(
    409,
    'Booking request is not pending, or its hold has expired',
  )
  create(
    @CurrentUser() admin: User,
    @Param('id', { schema: bookingRequestIdParamSchema }) id: number,
  ): Promise<BookingRequestApprovalResponse> {
    return this.adminBookingRequestApprovalService.approve(admin, id);
  }
}
