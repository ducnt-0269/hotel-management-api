import { z } from 'zod';

import {
  paginatedSchema,
  paginationQuerySchema,
} from '../../common/pagination/pagination.schema.js';
import { userSummarySchema } from '../../users/schemas/user.schema.js';
import {
  bookingRequestResponseSchema,
  bookingRequestStatusSchema,
  idSchema,
} from './booking-request.schema.js';

// An unknown `userId` or `roomTypeId` matches nothing: an empty page, not 404.
export const listBookingRequestsQuerySchema = paginationQuerySchema.extend({
  status: bookingRequestStatusSchema.optional(),
  roomTypeId: idSchema.optional(),
  userId: idSchema.optional(),
});

// The guest's shape plus who raised the request.
export const adminBookingRequestResponseSchema =
  bookingRequestResponseSchema.extend({
    user: userSummarySchema,
  });

export const adminBookingRequestListResponseSchema = paginatedSchema(
  adminBookingRequestResponseSchema,
);

export type ListBookingRequestsQuery = z.infer<
  typeof listBookingRequestsQuerySchema
>;

export type AdminBookingRequestResponse = z.infer<
  typeof adminBookingRequestResponseSchema
>;
