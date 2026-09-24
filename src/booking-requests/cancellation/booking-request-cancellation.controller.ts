import { Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../../common/api-docs/api-error-response.decorator.js';
import { RespondsWith } from '../../common/api-docs/responds-with.decorator.js';
import { bookingRequestIdParamSchema } from '../schemas/booking-request.schema.js';
import { BookingRequestCancellationService } from './booking-request-cancellation.service.js';
import { bookingRequestCancellationResponseSchema } from './schemas/booking-request-cancellation.schema.js';

import type { User } from '../../users/entities/user.entity.js';
import type { BookingRequestCancellationResponse } from './schemas/booking-request-cancellation.schema.js';

@ApiBearerAuth()
@Roles('user')
@ApiErrorResponse(403, 'Forbidden')
@Controller('booking-requests/:id/cancellation')
export class BookingRequestCancellationController {
  constructor(
    private readonly bookingRequestCancellationService: BookingRequestCancellationService,
  ) {}

  @Post()
  @RespondsWith(bookingRequestCancellationResponseSchema, {
    status: 201,
    description: 'Request withdrawn; its rooms are free again',
  })
  @ApiErrorResponse(404, 'Booking request not found')
  @ApiErrorResponse(409, 'Booking request is not pending')
  create(
    @CurrentUser() user: User,
    @Param('id', { schema: bookingRequestIdParamSchema }) id: number,
  ): Promise<BookingRequestCancellationResponse> {
    return this.bookingRequestCancellationService.cancel(user, id);
  }
}
