import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookingRequestsController } from './booking-requests.controller.js';
import { BookingRequestsService } from './booking-requests.service.js';
import { BookingRequest } from './entities/booking-request.entity.js';
import { BookingRequestExpirationService } from './expiration/booking-request-expiration.service.js';
import { BookingRequestExpiration } from './expiration/entities/booking-request-expiration.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingRequest, BookingRequestExpiration]),
  ],
  controllers: [BookingRequestsController],
  providers: [BookingRequestsService, BookingRequestExpirationService],
})
export class BookingRequestsModule {}
