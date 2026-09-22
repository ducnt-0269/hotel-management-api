import { Factory } from 'fishery';
import { DataSource } from 'typeorm';

import { Amenity } from '../../../src/amenities/entities/amenity.entity.js';

import type { INestApplication } from '@nestjs/common';

export interface AmenityAttributes {
  code: string;
}

export const amenityAttributes = Factory.define<AmenityAttributes>(
  ({ sequence }) => ({ code: `amenity_${sequence}` }),
);

// Room types in one test share codes, so an existing row is reused.
export async function createAmenity(
  app: INestApplication,
  overrides: Partial<AmenityAttributes> = {},
): Promise<Amenity> {
  const { code } = amenityAttributes.build(overrides);
  const amenities = app.get(DataSource).getRepository(Amenity);

  return (
    (await amenities.findOneBy({ code })) ??
    (await amenities.save(amenities.create({ code })))
  );
}
