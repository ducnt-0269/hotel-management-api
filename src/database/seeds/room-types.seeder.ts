import { In } from 'typeorm';

import { Amenity } from '../../amenities/entities/amenity.entity.js';
import { RoomTypeAmenity } from '../../room-types/entities/room-type-amenity.entity.js';
import { RoomType } from '../../room-types/entities/room-type.entity.js';

import type { DataSource } from 'typeorm';

interface RoomTypeSeed {
  name: string;
  description: string;
  pricePerNight: number;
  totalRooms: number;
  amenities: string[];
}

// Demo data, meant to be edited. Each carries exactly one `bed_*` and one
// `view_*` — the database does not enforce that, data entry does.
const ROOM_TYPES: RoomTypeSeed[] = [
  {
    name: 'Economy Single',
    description:
      'Phòng tiết kiệm 16m², một giường đơn, không có cửa sổ hướng cảnh. Phù hợp cho khách công tác ngắn ngày.',
    pricePerNight: 600_000,
    totalRooms: 5,
    amenities: ['air_conditioning', 'wifi', 'bed_single', 'view_none'],
  },
  {
    name: 'Standard Twin',
    description:
      'Phòng 22m² với hai giường đơn, cửa sổ hướng phố. Lựa chọn quen thuộc cho nhóm hai người đi cùng.',
    pricePerNight: 850_000,
    totalRooms: 10,
    amenities: ['air_conditioning', 'wifi', 'tv', 'bed_twin', 'view_city'],
  },
  {
    name: 'Standard Double',
    description:
      'Phòng 22m² với một giường đôi, nội thất gỗ sáng màu, bàn làm việc riêng.',
    pricePerNight: 950_000,
    totalRooms: 8,
    amenities: ['air_conditioning', 'wifi', 'tv', 'bed_double', 'view_none'],
  },
  {
    name: 'Superior Garden View',
    description:
      'Phòng 28m² có ban công nhìn ra sân vườn, giường đôi, minibar và góc tiếp khách nhỏ.',
    pricePerNight: 1_400_000,
    totalRooms: 6,
    amenities: [
      'air_conditioning',
      'wifi',
      'tv',
      'minibar',
      'balcony',
      'bed_double',
      'view_garden',
    ],
  },
  {
    name: 'Deluxe Sea View',
    description:
      'Phòng 35m² giường king, ban công riêng hướng biển, minibar đầy đủ. Đón bình minh ngay trên ban công.',
    pricePerNight: 2_200_000,
    totalRooms: 4,
    amenities: [
      'air_conditioning',
      'wifi',
      'tv',
      'minibar',
      'balcony',
      'bed_king',
      'view_sea',
    ],
  },
  {
    name: 'Suite Ocean Front',
    description:
      'Suite góc 52m² hai mặt kính hướng biển, giường king, bồn tắm nằm và phòng khách tách biệt.',
    pricePerNight: 3_800_000,
    totalRooms: 2,
    amenities: [
      'air_conditioning',
      'wifi',
      'tv',
      'minibar',
      'balcony',
      'bathtub',
      'bed_king',
      'view_sea',
    ],
  },
];

// Never overwrites a row already there, so edits to a seeded database survive.
export async function seedRoomTypes(dataSource: DataSource): Promise<void> {
  // Resolves codes to ids only; the catalogue belongs to its own seeder.
  const amenities = dataSource.getRepository(Amenity);
  const roomTypes = dataSource.getRepository(RoomType);
  const links = dataSource.getRepository(RoomTypeAmenity);
  let seeded = 0;
  let skipped = 0;

  for (const row of ROOM_TYPES) {
    if (await roomTypes.findOneBy({ name: row.name })) {
      console.log(`skipped  ${row.name}`);
      skipped += 1;
      continue;
    }

    const roomType = await roomTypes.save(
      roomTypes.create({
        name: row.name,
        description: row.description,
        pricePerNight: String(row.pricePerNight),
        totalRooms: row.totalRooms,
      }),
    );

    const amenityRows = await amenities.findBy({ code: In(row.amenities) });
    // A typo would otherwise leave a room type quietly missing an amenity.
    if (amenityRows.length !== row.amenities.length) {
      throw new Error(`${row.name}: seed data names an unknown amenity code`);
    }

    await links.insert(
      amenityRows.map((amenity) => ({
        roomTypeId: roomType.id,
        amenityId: amenity.id,
      })),
    );
    console.log(`seeded   ${row.name}`);
    seeded += 1;
  }

  console.log(`room types: ${seeded} seeded, ${skipped} skipped`);
}
