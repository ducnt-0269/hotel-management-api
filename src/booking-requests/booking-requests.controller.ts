import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
import { BookingRequestsService } from './booking-requests.service.js';
import {
  bookingRequestResponseSchema,
  createBookingRequestBodySchema,
} from './schemas/booking-request.schema.js';

import type { User } from '../users/entities/user.entity.js';
import type {
  BookingRequestResponse,
  CreateBookingRequestBody,
} from './schemas/booking-request.schema.js';

@ApiBearerAuth()
@Controller('booking-requests')
export class BookingRequestsController {
  constructor(
    private readonly bookingRequestsService: BookingRequestsService,
  ) {}

  // Guests raise requests; admins decide on them, never raise them.
  @Roles('user')
  @Post()
  @HttpCode(201)
  @RespondsWith(bookingRequestResponseSchema, {
    status: 201,
    description: 'Request recorded as pending; its rooms are held',
  })
  @ApiErrorResponse(403, 'Forbidden')
  @ApiErrorResponse(404, 'Room type not found')
  @ApiErrorResponse(
    409,
    'Room type is not bookable, or not enough rooms on one or more nights',
  )
  create(
    @CurrentUser() user: User,
    @Body({ schema: createBookingRequestBodySchema })
    body: CreateBookingRequestBody,
  ): Promise<BookingRequestResponse> {
    return this.bookingRequestsService.create(user, body);
  }
}
