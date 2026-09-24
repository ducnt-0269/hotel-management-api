import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { availableRoomsPerNightByRoomType } from '../booking-requests/booking-request-availability.js';
import { paginate, toSkipTake } from '../common/pagination/paginate.js';
import { RoomTypeAmenity } from './entities/room-type-amenity.entity.js';
import { RoomType } from './entities/room-type.entity.js';
import { toRoomTypeResponse } from './room-type.mapper.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type {
  ListRoomTypesQuery,
  RoomTypeResponse,
} from './schemas/room-type.schema.js';
import type { FindOptionsSelect } from 'typeorm';

// The columns `toRoomTypeResponse` reads, plus `totalRooms` for the
// availability count; inventory size stays out of the public response.
const roomTypeResponseColumns: FindOptionsSelect<RoomType> = {
  id: true,
  name: true,
  description: true,
  pricePerNight: true,
  totalRooms: true,
  createdAt: true,
  updatedAt: true,
  amenityLinks: { id: true, amenity: { id: true, code: true } },
};

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectRepository(RoomType)
    private readonly roomTypesRepository: Repository<RoomType>,
    @InjectRepository(RoomTypeAmenity)
    private readonly roomTypeAmenitiesRepository: Repository<RoomTypeAmenity>,
  ) {}

  // Every room type matching the filters is loaded and checked, then paged in
  // memory: a hotel sells a few dozen types, and `meta.total` has to count
  // only those that fit the stay.
  async list(query: ListRoomTypesQuery): Promise<Paginated<RoomTypeResponse>> {
    const hasAmenityFilter = query.amenities.length > 0;
    const matchingRoomTypeIds = hasAmenityFilter
      ? await this.findRoomTypeIdsWithAllAmenities(query.amenities)
      : [];

    const roomTypes = await this.roomTypesRepository.find({
      select: roomTypeResponseColumns,
      // No match is an empty `IN`, which is how an unknown code returns nothing.
      where: hasAmenityFilter ? { id: In(matchingRoomTypeIds) } : {},
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

  // AND semantics: a room type has to carry every code asked for. This needs a
  // query of its own because `findAndCount` clears GROUP BY before counting,
  // so a HAVING filter on the main query would report a wrong `meta.total`.
  private async findRoomTypeIdsWithAllAmenities(
    codes: string[],
  ): Promise<string[]> {
    const rows = await this.roomTypeAmenitiesRepository
      .createQueryBuilder('link')
      .innerJoin('link.amenity', 'amenity')
      .select('link.roomTypeId', 'id')
      .where('amenity.code IN (:...codes)', { codes })
      .groupBy('link.roomTypeId')
      .having('COUNT(DISTINCT amenity.code) = :required', {
        required: codes.length,
      })
      .getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  }
}
