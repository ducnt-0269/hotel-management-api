import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { paginate, toSkipTake } from '../common/pagination/paginate.js';
import { RoomType } from '../room-types/entities/room-type.entity.js';
import { availableRoomsPerNightByRoomType } from './booking-request-availability.js';
import { holdExpiry, stayNights } from './booking-request-dates.js';
import { findBookingRequestOutcomes } from './booking-request-outcomes.js';
import {
  bookingRequestResponseColumns,
  toBookingRequestResponse,
} from './booking-request.mapper.js';
import { BookingRequest } from './entities/booking-request.entity.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type { User } from '../users/entities/user.entity.js';
import type {
  BookingRequestResponse,
  CreateBookingRequestBody,
  ListOwnBookingRequestsQuery,
} from './schemas/booking-request.schema.js';

@Injectable()
export class BookingRequestsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(BookingRequest)
    private readonly bookingRequestsRepository: Repository<BookingRequest>,
  ) {}

  async listOwn(
    user: User,
    query: ListOwnBookingRequestsQuery,
  ): Promise<Paginated<BookingRequestResponse>> {
    const { status, roomTypeId } = query;
    const [rows, total] = await this.bookingRequestsRepository.findAndCount({
      select: bookingRequestResponseColumns,
      where: {
        ...(status && { status }),
        ...(roomTypeId && { roomTypeId: String(roomTypeId) }),
        userId: user.id,
      },
      relations: { roomType: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      ...toSkipTake(query),
    });
    const [payments, rejections] = await findBookingRequestOutcomes(
      this.dataSource.manager,
      rows.map((row) => row.id),
    );
    return paginate(
      rows.map((row) =>
        toBookingRequestResponse(row, row.roomType, payments, rejections),
      ),
      total,
      query,
    );
  }

  // Someone else's request is a 404, not a 403: its existence stays private.
  async findOwn(user: User, id: number): Promise<BookingRequestResponse> {
    const bookingRequest = await this.bookingRequestsRepository.findOne({
      select: bookingRequestResponseColumns,
      where: { id: String(id), userId: user.id },
      relations: { roomType: true },
    });
    if (!bookingRequest) {
      throw new NotFoundException('Booking request not found');
    }
    const [payments, rejections] = await findBookingRequestOutcomes(
      this.dataSource.manager,
      [bookingRequest.id],
    );
    return toBookingRequestResponse(
      bookingRequest,
      bookingRequest.roomType,
      payments,
      rejections,
    );
  }

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

      const bookingRequest = await manager.save(BookingRequest, {
        userId: user.id,
        roomTypeId: roomType.id,
        roomsRequested: body.roomsRequested,
        checkInDate: body.checkInDate,
        checkOutDate: body.checkOutDate,
        // Fixed now; a later price change never touches an existing request.
        totalAmount: String(
          BigInt(roomType.pricePerNight) *
            BigInt(stayNights(body.checkInDate, body.checkOutDate)) *
            BigInt(body.roomsRequested),
        ),
        status: 'pending',
        expiresAt: holdExpiry(new Date(), body.checkInDate),
      });

      // A new request is still pending: not paid, not rejected.
      return toBookingRequestResponse(bookingRequest, roomType, [], []);
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
    const nights = (
      await availableRoomsPerNightByRoomType(
        manager,
        [roomType],
        checkInDate,
        checkOutDate,
      )
    ).get(roomType.id)!;

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
