import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookingRequestExpirationService } from './booking-request-expiration.service.js';
import { BookingRequestsController } from './booking-requests.controller.js';
import { BookingRequestsService } from './booking-requests.service.js';
import { BookingRequestExpiration } from './entities/booking-request-expiration.entity.js';
import { BookingRequest } from './entities/booking-request.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingRequest, BookingRequestExpiration]),
  ],
  controllers: [BookingRequestsController],
  providers: [BookingRequestsService, BookingRequestExpirationService],
})
export class BookingRequestsModule {}
