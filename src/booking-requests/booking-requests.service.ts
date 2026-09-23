import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { RoomType } from '../room-types/entities/room-type.entity.js';
import { availableRoomsPerNight } from './booking-request-availability.js';
import { toBookingRequestResponse } from './booking-request.mapper.js';
import { BookingRequest } from './entities/booking-request.entity.js';
import { newBookingRequest } from './new-booking-request.js';

import type { User } from '../users/entities/user.entity.js';
import type {
  BookingRequestResponse,
  CreateBookingRequestBody,
} from './schemas/booking-request.schema.js';

@Injectable()
export class BookingRequestsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async create(
    user: User,
    body: CreateBookingRequestBody,
  ): Promise<BookingRequestResponse> {
    return this.dataSource.transaction(async (manager) => {
      const roomType = await this.findBookableRoomTypeOrFail(
        manager,
        body.roomTypeId,
      );
      await this.ensureNoOverbookedNight(manager, roomType, body);

      const bookingRequest = await manager.save(
        BookingRequest,
        newBookingRequest(user, roomType, body, new Date()),
      );

      return toBookingRequestResponse(bookingRequest, roomType);
    });
  }

  private async findBookableRoomTypeOrFail(
    manager: EntityManager,
    roomTypeId: number,
  ): Promise<RoomType> {
    // Serialize capacity checks for concurrent requests of this room type.
    const roomType = await manager.findOne(RoomType, {
      where: { id: String(roomTypeId) },
      lock: { mode: 'pessimistic_write' },
    });
    if (!roomType) throw new NotFoundException('Room type not found');
    if (roomType.totalRooms === 0) {
      throw new ConflictException('Room type is not bookable');
    }
    return roomType;
  }

  private async ensureNoOverbookedNight(
    manager: EntityManager,
    roomType: RoomType,
    { checkInDate, checkOutDate, roomsRequested }: CreateBookingRequestBody,
  ): Promise<void> {
    const nights = await availableRoomsPerNight(
      manager,
      roomType,
      checkInDate,
      checkOutDate,
    );

    // Per night, not over the whole stay: a stay can fit overall yet overflow
    // on a single night.
    const shortNights = nights
      .filter(({ available }) => available < roomsRequested)
      .map(({ night }) => night);

    if (shortNights.length > 0) {
      throw new ConflictException(
        `Not enough rooms on ${shortNights.join(', ')}`,
      );
    }
  }
}
