import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AmenitiesController } from './amenities.controller.js';
import { AmenitiesService } from './amenities.service.js';
import { Amenity } from './entities/amenity.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Amenity])],
  controllers: [AmenitiesController],
  providers: [AmenitiesService],
})
export class AmenitiesModule {}
