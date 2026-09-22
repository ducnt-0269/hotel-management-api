import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Amenity } from '../../amenities/entities/amenity.entity.js';
import { RoomType } from './room-type.entity.js';

import type { Relation } from 'typeorm';

// An entity of its own rather than a TypeORM `@JoinTable`: every table here
// carries its own `id` and `created_at`, which a join table cannot express.
@Entity('room_type_amenities')
@Unique('room_type_amenities_room_type_id_amenity_id_key', [
  'roomTypeId',
  'amenityId',
])
export class RoomTypeAmenity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  // Plain columns as well as relations, so the filter can group by
  // `room_type_id` without joining `room_types`.
  @Column({ name: 'room_type_id', type: 'bigint' })
  roomTypeId: string;

  // The UNIQUE above leads with `room_type_id`, so it cannot serve the
  // filter's lookup by amenity.
  @Index()
  @Column({ name: 'amenity_id', type: 'bigint' })
  amenityId: string;

  @ManyToOne(() => RoomType, (roomType) => roomType.amenityLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'room_type_id' })
  roomType: Relation<RoomType>;

  @ManyToOne(() => Amenity)
  @JoinColumn({ name: 'amenity_id' })
  amenity: Relation<Amenity>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
