import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../../common/api-docs/api-error-response.decorator.js';
import { RespondsWith } from '../../common/api-docs/responds-with.decorator.js';
import { bookingRequestIdParamSchema } from '../schemas/booking-request.schema.js';
import { AdminBookingRequestRejectionService } from './admin-booking-request-rejection.service.js';
import {
  bookingRequestRejectionResponseSchema,
  createBookingRequestRejectionBodySchema,
} from './schemas/booking-request-rejection.schema.js';

import type { User } from '../../users/entities/user.entity.js';
import type {
  BookingRequestRejectionResponse,
  CreateBookingRequestRejectionBody,
} from './schemas/booking-request-rejection.schema.js';

@ApiBearerAuth()
@Roles('admin')
@ApiErrorResponse(403, 'Forbidden')
@Controller('admin/booking-requests/:id/rejection')
export class AdminBookingRequestRejectionController {
  constructor(
    private readonly adminBookingRequestRejectionService: AdminBookingRequestRejectionService,
  ) {}

  @Post()
  @RespondsWith(bookingRequestRejectionResponseSchema, {
    status: 201,
    description: 'Request rejected; its rooms are free again',
  })
  @ApiErrorResponse(404, 'Booking request not found')
  @ApiErrorResponse(409, 'Booking request is not pending')
  create(
    @CurrentUser() admin: User,
    @Param('id', { schema: bookingRequestIdParamSchema }) id: number,
    @Body({ schema: createBookingRequestRejectionBodySchema })
    body: CreateBookingRequestRejectionBody,
  ): Promise<BookingRequestRejectionResponse> {
    return this.adminBookingRequestRejectionService.reject(admin, id, body);
  }
}
