import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookingRequestsController } from './booking-requests.controller.js';
import { BookingRequestsService } from './booking-requests.service.js';
import { BookingRequest } from './entities/booking-request.entity.js';
import { BookingRequestExpiration } from './expiration/booking-request-expiration.entity.js';
import { BookingRequestExpirationService } from './expiration/booking-request-expiration.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingRequest, BookingRequestExpiration]),
  ],
  controllers: [BookingRequestsController],
  providers: [BookingRequestsService, BookingRequestExpirationService],
})
export class BookingRequestsModule {}
