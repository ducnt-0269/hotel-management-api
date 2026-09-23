import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { DataSource } from 'typeorm';

import { Amenity } from '../../../src/amenities/entities/amenity.entity.js';
import { RoomTypeAmenity } from '../../../src/room-types/entities/room-type-amenity.entity.js';
import { RoomType } from '../../../src/room-types/entities/room-type.entity.js';
import { createAmenity } from './amenity.factory.js';

import type { INestApplication } from '@nestjs/common';

export interface RoomTypeAttributes {
  name: string;
  description: string;
  pricePerNight: number;
  totalRooms: number;
  amenities: string[];
}

export const roomTypeAttributes = Factory.define<RoomTypeAttributes>(
  ({ sequence }) => ({
    name: `Room Type ${sequence} ${faker.string.alphanumeric(4)}`,
    description: faker.lorem.sentence(),
    pricePerNight: faker.number.int({ min: 5, max: 40 }) * 100_000,
    totalRooms: faker.number.int({ min: 1, max: 10 }),
    amenities: [],
  }),
);

// Persists a room type and its links, so a spec only deals in codes.
export async function createRoomType(
  app: INestApplication,
  overrides: Partial<RoomTypeAttributes> = {},
): Promise<RoomType> {
  const attributes = roomTypeAttributes.build(overrides);
  const dataSource = app.get(DataSource);
  const roomTypes = dataSource.getRepository(RoomType);

  const roomType = await roomTypes.save(
    roomTypes.create({
      name: attributes.name,
      description: attributes.description,
      pricePerNight: String(attributes.pricePerNight),
      totalRooms: attributes.totalRooms,
    }),
  );

  // Sequential: the same code twice in parallel would race on its UNIQUE.
  const amenities: Amenity[] = [];
  for (const code of new Set(attributes.amenities)) {
    amenities.push(await createAmenity(app, { code }));
  }

  if (amenities.length > 0) {
    await dataSource.getRepository(RoomTypeAmenity).insert(
      amenities.map((amenity) => ({
        roomTypeId: roomType.id,
        amenityId: amenity.id,
      })),
    );
  }

  return roomType;
}
