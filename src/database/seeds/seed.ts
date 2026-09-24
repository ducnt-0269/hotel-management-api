import dataSource from '../data-source.js';
import { seedAmenities } from './amenities.seeder.js';
import { seedRoomTypes } from './room-types.seeder.js';
import { seedUsers } from './users.seeder.js';

import type { DataSource } from 'typeorm';

// Local and demo data only; tests build their own fixtures. One seeder per
// domain — adding a domain means a file and a line here, in dependency order.
const SEEDERS: Record<string, (dataSource: DataSource) => Promise<void>> = {
  users: seedUsers,
  amenities: seedAmenities,
  'room-types': seedRoomTypes,
};

// `npm run seed` runs every seeder; `npm run seed -- users room-types` runs
// only those. Either way they run in the order above, not the order typed,
// and a dependency is not pulled in: room-types still needs amenities seeded.
function pickSeeders(names: string[]): string[] {
  const unknown = names.filter((name) => !Object.hasOwn(SEEDERS, name));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown seeder: ${unknown.join(', ')}. Available: ${Object.keys(SEEDERS).join(', ')}`,
    );
  }
  const all = Object.keys(SEEDERS);
  return names.length > 0 ? all.filter((name) => names.includes(name)) : all;
}

async function seed(names: string[]): Promise<void> {
  const selected = pickSeeders(names);
  await dataSource.initialize();

  try {
    for (const name of selected) {
      await SEEDERS[name](dataSource);
    }
  } finally {
    await dataSource.destroy();
  }
}

await seed(process.argv.slice(2));
