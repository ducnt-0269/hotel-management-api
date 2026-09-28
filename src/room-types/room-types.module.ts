import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminRoomTypeExportService } from './admin-room-type-export.service.js';
import { AdminRoomTypesController } from './admin-room-types.controller.js';
import { AdminRoomTypesService } from './admin-room-types.service.js';
import { RoomTypeAmenity } from './entities/room-type-amenity.entity.js';
import { RoomType } from './entities/room-type.entity.js';
import { RoomTypesController } from './room-types.controller.js';
import { RoomTypesService } from './room-types.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([RoomType, RoomTypeAmenity])],
  controllers: [RoomTypesController, AdminRoomTypesController],
  providers: [
    RoomTypesService,
    AdminRoomTypesService,
    AdminRoomTypeExportService,
  ],
})
export class RoomTypesModule {}
