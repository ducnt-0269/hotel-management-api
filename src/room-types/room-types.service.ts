import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { paginate, toSkipTake } from '../common/pagination/paginate.js';
import { RoomTypeAmenity } from './entities/room-type-amenity.entity.js';
import { RoomType } from './entities/room-type.entity.js';

import type { Amenity } from '../amenities/entities/amenity.entity.js';
import type { Paginated } from '../common/pagination/paginate.js';
import type { ListRoomTypesQuery } from './schemas/room-type.schema.js';

type AmenitySummary = Pick<Amenity, 'id' | 'code'>;

// The entity row, NOT the response shape: `id` and `pricePerNight` are still
// bigint strings, so arithmetic on a price has to convert first.
export type RoomTypeWithAmenities = Omit<RoomType, 'amenityLinks'> & {
  amenities: AmenitySummary[];
};

// Sorted: the join returns links in whatever order Postgres picks.
function toRoomTypeWithAmenities({
  amenityLinks,
  ...roomType
}: RoomType): RoomTypeWithAmenities {
  return {
    ...roomType,
    amenities: amenityLinks
      .map(({ amenity }) => ({ id: amenity.id, code: amenity.code }))
      .sort((a, b) => a.code.localeCompare(b.code)),
  };
}

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectRepository(RoomType)
    private readonly roomTypesRepository: Repository<RoomType>,
    @InjectRepository(RoomTypeAmenity)
    private readonly roomTypeAmenitiesRepository: Repository<RoomTypeAmenity>,
  ) {}

  async list(
    query: ListRoomTypesQuery,
  ): Promise<Paginated<RoomTypeWithAmenities>> {
    const hasAmenityFilter = query.amenities.length > 0;
    const matchingRoomTypeIds = hasAmenityFilter
      ? await this.findRoomTypeIdsWithAllAmenities(query.amenities)
      : [];

    const [rows, total] = await this.roomTypesRepository.findAndCount({
      // No match is an empty `IN`, which is how an unknown code returns nothing.
      where: hasAmenityFilter ? { id: In(matchingRoomTypeIds) } : {},
      relations: { amenityLinks: { amenity: true } },
      order: { id: 'ASC' },
      ...toSkipTake(query),
    });

    return paginate(rows.map(toRoomTypeWithAmenities), total, query);
  }

  async findOne(id: number): Promise<RoomTypeWithAmenities> {
    const roomType = await this.roomTypesRepository.findOne({
      where: { id: String(id) },
      relations: { amenityLinks: { amenity: true } },
    });
    if (!roomType) throw new NotFoundException('Room type not found');

    return toRoomTypeWithAmenities(roomType);
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
