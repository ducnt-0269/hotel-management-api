import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { availableRoomsPerNightByRoomType } from '../booking-requests/booking-request-availability.js';
import { paginate, toSkipTake } from '../common/pagination/paginate.js';
import { RoomType } from './entities/room-type.entity.js';
import { roomTypesWithAllAmenities } from './room-type-amenities.js';
import {
  roomTypeResponseColumns,
  toRoomTypeResponse,
} from './room-type.mapper.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type {
  ListRoomTypesQuery,
  RoomTypeResponse,
} from './schemas/room-type.schema.js';

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectRepository(RoomType)
    private readonly roomTypesRepository: Repository<RoomType>,
  ) {}

  // Every room type matching the filters is loaded and checked, then paged in
  // memory: a hotel sells a few dozen types, and `meta.total` has to count
  // only those that fit the stay.
  async list(query: ListRoomTypesQuery): Promise<Paginated<RoomTypeResponse>> {
    const roomTypes = await this.roomTypesRepository.find({
      select: roomTypeResponseColumns,
      where: roomTypesWithAllAmenities(query.amenities),
      relations: { amenityLinks: { amenity: true } },
      order: { id: 'ASC' },
    });
    const freePerNight = await availableRoomsPerNightByRoomType(
      this.roomTypesRepository.manager,
      roomTypes,
      query.checkInDate,
      query.checkOutDate,
    );

    const fitting = roomTypes.filter((roomType) =>
      freePerNight
        .get(roomType.id)!
        .every((night) => night.available >= query.rooms),
    );
    const { skip, take } = toSkipTake(query);
    return paginate(
      fitting.slice(skip, skip + take).map(toRoomTypeResponse),
      fitting.length,
      query,
    );
  }

  async findOne(id: number): Promise<RoomTypeResponse> {
    const roomType = await this.roomTypesRepository.findOne({
      select: roomTypeResponseColumns,
      where: { id: String(id) },
      relations: { amenityLinks: { amenity: true } },
    });
    if (!roomType) throw new NotFoundException('Room type not found');

    return toRoomTypeResponse(roomType);
  }
}
