import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RoomTypeAmenity } from './room-type-amenity.entity.js';

import type { Relation } from 'typeorm';

// The unit sold is a room type: there is no `rooms` table, by design.
@Entity('room_types')
@Check('room_types_total_rooms_check', 'total_rooms >= 0')
export class RoomType {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text' })
  description: string;

  // Integer VND; a bigint arrives from the driver as a string.
  @Column({ name: 'price_per_night', type: 'bigint' })
  pricePerNight: string;

  // 0 = the hotel has stopped selling this type.
  @Column({ name: 'total_rooms', type: 'int' })
  totalRooms: number;

  @OneToMany(() => RoomTypeAmenity, (link) => link.roomType)
  amenityLinks: Relation<RoomTypeAmenity[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
