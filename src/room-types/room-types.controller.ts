import { Controller, Get, Param, Query } from '@nestjs/common';

import { Public } from '../auth/decorators/public.decorator.js';
import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
import { RoomTypesService } from './room-types.service.js';
import {
  listRoomTypesQuerySchema,
  roomTypeIdParamSchema,
  roomTypeListResponseSchema,
  roomTypeResponseSchema,
} from './schemas/room-type.schema.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type { RoomTypeWithAmenities } from './room-types.service.js';
import type { ListRoomTypesQuery } from './schemas/room-type.schema.js';

// `@Public()` sits per method, not on the class: there is no `@Public(false)`,
// so a class-level mark would quietly make the later admin routes public.
@Controller('room-types')
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  @Public()
  @Get()
  @RespondsWith(roomTypeListResponseSchema, {
    status: 200,
    description: 'Room types on sale',
  })
  list(
    @Query({ schema: listRoomTypesQuerySchema }) query: ListRoomTypesQuery,
  ): Promise<Paginated<RoomTypeWithAmenities>> {
    return this.roomTypesService.list(query);
  }

  @Public()
  @Get(':id')
  @RespondsWith(roomTypeResponseSchema, {
    status: 200,
    description: 'One room type',
  })
  @ApiErrorResponse(404, 'Room type not found')
  findOne(
    @Param('id', { schema: roomTypeIdParamSchema }) id: number,
  ): Promise<RoomTypeWithAmenities> {
    return this.roomTypesService.findOne(id);
  }
}
