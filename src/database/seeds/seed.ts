import dataSource from '../data-source.js';
import { seedAmenities } from './amenities.seeder.js';
import { seedRoomTypes } from './room-types.seeder.js';

// Local and demo data only; tests build their own fixtures. One seeder per
// domain — adding a domain means a file and a line here, in dependency order.
const SEEDERS = [seedAmenities, seedRoomTypes];

async function seed(): Promise<void> {
  await dataSource.initialize();

  try {
    for (const runSeeder of SEEDERS) {
      await runSeeder(dataSource);
    }
  } finally {
    await dataSource.destroy();
  }
}

await seed();
