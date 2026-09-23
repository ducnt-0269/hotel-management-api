import { Controller, Get, Query } from '@nestjs/common';

import { Public } from '../auth/decorators/public.decorator.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
import { paginationQuerySchema } from '../common/pagination/pagination.schema.js';
import { AmenitiesService } from './amenities.service.js';
import { amenityListResponseSchema } from './schemas/amenity.schema.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type { PaginationQuery } from '../common/pagination/pagination.schema.js';
import type { Amenity } from './entities/amenity.entity.js';

@Controller('amenities')
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @Public()
  @Get()
  @RespondsWith(amenityListResponseSchema, {
    status: 200,
    description: 'Codes a room type search can filter by',
  })
  list(
    @Query({ schema: paginationQuerySchema }) query: PaginationQuery,
  ): Promise<Paginated<Amenity>> {
    return this.amenitiesService.list(query);
  }
}
