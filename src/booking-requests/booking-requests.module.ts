import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookingRequestsController } from './booking-requests.controller.js';
import { BookingRequestsService } from './booking-requests.service.js';
import { BookingRequestExpiration } from './entities/booking-request-expiration.entity.js';
import { BookingRequest } from './entities/booking-request.entity.js';
import { HoldExpiryService } from './hold-expiry.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingRequest, BookingRequestExpiration]),
  ],
  controllers: [BookingRequestsController],
  providers: [BookingRequestsService, HoldExpiryService],
})
export class BookingRequestsModule {}
