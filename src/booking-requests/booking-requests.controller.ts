import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
import { BookingRequestsService } from './booking-requests.service.js';
import {
  bookingRequestIdParamSchema,
  bookingRequestListResponseSchema,
  bookingRequestResponseSchema,
  createBookingRequestBodySchema,
  listOwnBookingRequestsQuerySchema,
} from './schemas/booking-request.schema.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type { User } from '../users/entities/user.entity.js';
import type {
  BookingRequestResponse,
  CreateBookingRequestBody,
  ListOwnBookingRequestsQuery,
} from './schemas/booking-request.schema.js';

// Guests raise requests; admins decide on them, never raise them.
@ApiBearerAuth()
@Roles('user')
@ApiErrorResponse(403, 'Forbidden')
@Controller('booking-requests')
export class BookingRequestsController {
  constructor(
    private readonly bookingRequestsService: BookingRequestsService,
  ) {}

  @Post()
  @RespondsWith(bookingRequestResponseSchema, {
    status: 201,
    description: 'Request recorded as pending; its rooms are held',
  })
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

  @Get()
  @RespondsWith(bookingRequestListResponseSchema, {
    status: 200,
    description: 'Your own requests, newest first',
  })
  list(
    @CurrentUser() user: User,
    @Query({ schema: listOwnBookingRequestsQuerySchema })
    query: ListOwnBookingRequestsQuery,
  ): Promise<Paginated<BookingRequestResponse>> {
    return this.bookingRequestsService.listOwn(user, query);
  }

  @Get(':id')
  @RespondsWith(bookingRequestResponseSchema, {
    status: 200,
    description: 'One of your own requests',
  })
  @ApiErrorResponse(404, 'Booking request not found')
  findOne(
    @CurrentUser() user: User,
    @Param('id', { schema: bookingRequestIdParamSchema }) id: number,
  ): Promise<BookingRequestResponse> {
    return this.bookingRequestsService.findOwn(user, id);
  }
}
