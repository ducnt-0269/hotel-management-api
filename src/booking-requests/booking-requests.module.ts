import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminBookingRequestApprovalController } from './approval/admin-booking-request-approval.controller.js';
import { AdminBookingRequestApprovalService } from './approval/admin-booking-request-approval.service.js';
import { BookingRequestApproval } from './approval/entities/booking-request-approval.entity.js';
import { BookingRequestsController } from './booking-requests.controller.js';
import { BookingRequestsService } from './booking-requests.service.js';
import { BookingRequestCancellationController } from './cancellation/booking-request-cancellation.controller.js';
import { BookingRequestCancellationService } from './cancellation/booking-request-cancellation.service.js';
import { BookingRequestCancellation } from './cancellation/entities/booking-request-cancellation.entity.js';
import { BookingRequest } from './entities/booking-request.entity.js';
import { BookingRequestExpirationService } from './expiration/booking-request-expiration.service.js';
import { BookingRequestExpiration } from './expiration/entities/booking-request-expiration.entity.js';
import { AdminBookingRequestRejectionController } from './rejection/admin-booking-request-rejection.controller.js';
import { AdminBookingRequestRejectionService } from './rejection/admin-booking-request-rejection.service.js';
import { BookingRequestRejection } from './rejection/entities/booking-request-rejection.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingRequest,
      BookingRequestApproval,
      BookingRequestCancellation,
      BookingRequestExpiration,
      BookingRequestRejection,
    ]),
  ],
  controllers: [
    BookingRequestsController,
    AdminBookingRequestApprovalController,
    AdminBookingRequestRejectionController,
    BookingRequestCancellationController,
  ],
  providers: [
    BookingRequestsService,
    AdminBookingRequestApprovalService,
    AdminBookingRequestRejectionService,
    BookingRequestCancellationService,
    BookingRequestExpirationService,
  ],
})
export class BookingRequestsModule {}
