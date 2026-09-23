import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { paginate, toSkipTake } from '../common/pagination/paginate.js';
import { toAmenityResponse } from './amenity.mapper.js';
import { Amenity } from './entities/amenity.entity.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type { PaginationQuery } from '../common/pagination/pagination.schema.js';
import type { AmenityResponse } from './schemas/amenity.schema.js';

@Injectable()
export class AmenitiesService {
  constructor(
    @InjectRepository(Amenity)
    private readonly amenitiesRepository: Repository<Amenity>,
  ) {}

  async list(query: PaginationQuery): Promise<Paginated<AmenityResponse>> {
    const [amenities, total] = await this.amenitiesRepository.findAndCount({
      order: { code: 'ASC' },
      ...toSkipTake(query),
    });

    return paginate(amenities.map(toAmenityResponse), total, query);
  }
}
