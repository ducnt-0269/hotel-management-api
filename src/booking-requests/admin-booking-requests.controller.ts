import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import { API_TAGS } from '../common/api-docs/api-tags.constants.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
import { AdminBookingRequestsService } from './admin-booking-requests.service.js';
import {
  adminBookingRequestListResponseSchema,
  adminBookingRequestResponseSchema,
  listBookingRequestsQuerySchema,
} from './schemas/admin-booking-request.schema.js';
import { bookingRequestIdParamSchema } from './schemas/booking-request.schema.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type {
  AdminBookingRequestResponse,
  ListBookingRequestsQuery,
} from './schemas/admin-booking-request.schema.js';

@ApiBearerAuth()
@Roles('admin')
@ApiErrorResponse(403, 'Forbidden')
@ApiTags(API_TAGS.adminBookingRequests)
@Controller('admin/booking-requests')
export class AdminBookingRequestsController {
  constructor(
    private readonly adminBookingRequestsService: AdminBookingRequestsService,
  ) {}

  @Get()
  @RespondsWith(adminBookingRequestListResponseSchema, {
    status: 200,
    description: 'Every guest’s requests, newest first',
  })
  list(
    @Query({ schema: listBookingRequestsQuerySchema })
    query: ListBookingRequestsQuery,
  ): Promise<Paginated<AdminBookingRequestResponse>> {
    return this.adminBookingRequestsService.list(query);
  }

  @Get(':id')
  @RespondsWith(adminBookingRequestResponseSchema, {
    status: 200,
    description: 'One request, with the guest who raised it',
  })
  @ApiErrorResponse(404, 'Booking request not found')
  findOne(
    @Param('id', { schema: bookingRequestIdParamSchema }) id: number,
  ): Promise<AdminBookingRequestResponse> {
    return this.adminBookingRequestsService.findOne(id);
  }
}
