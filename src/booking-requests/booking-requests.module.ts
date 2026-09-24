import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookingRequestsController } from './booking-requests.controller.js';
import { BookingRequestsService } from './booking-requests.service.js';
import { BookingRequestCancellationController } from './cancellation/booking-request-cancellation.controller.js';
import { BookingRequestCancellationService } from './cancellation/booking-request-cancellation.service.js';
import { BookingRequestCancellation } from './cancellation/entities/booking-request-cancellation.entity.js';
import { BookingRequest } from './entities/booking-request.entity.js';
import { BookingRequestExpirationService } from './expiration/booking-request-expiration.service.js';
import { BookingRequestExpiration } from './expiration/entities/booking-request-expiration.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingRequest,
      BookingRequestCancellation,
      BookingRequestExpiration,
    ]),
  ],
  controllers: [
    BookingRequestsController,
    BookingRequestCancellationController,
  ],
  providers: [
    BookingRequestsService,
    BookingRequestCancellationService,
    BookingRequestExpirationService,
  ],
})
export class BookingRequestsModule {}
