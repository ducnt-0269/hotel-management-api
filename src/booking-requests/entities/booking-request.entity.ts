import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RoomType } from '../../room-types/entities/room-type.entity.js';
import { User } from '../../users/entities/user.entity.js';

import type { Relation } from 'typeorm';

export type BookingRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired';

// A long-term event: inserted once, afterwards only `status` changes, and
// only together with a row in the matching outcome table.
@Entity('booking_requests')
@Check('booking_requests_rooms_requested_check', 'rooms_requested > 0')
@Check('booking_requests_stay_check', 'check_out_date > check_in_date')
@Check(
  'booking_requests_status_check',
  `status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')`,
)
@Index(['userId', 'createdAt'])
// Serves the per-day capacity sum: only holding requests count.
@Index(['roomTypeId', 'checkInDate', 'checkOutDate'], {
  where: `status IN ('pending', 'approved')`,
})
export class BookingRequest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Index()
  @Column({ name: 'room_type_id', type: 'bigint' })
  roomTypeId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToOne(() => RoomType)
  @JoinColumn({ name: 'room_type_id' })
  roomType: Relation<RoomType>;

  @Column({ name: 'rooms_requested', type: 'int' })
  roomsRequested: number;

  // Half-open stay: the check-out day is not a night.
  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate: string;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate: string;

  // Integer VND, fixed when the request is raised; never recalculated.
  @Column({ name: 'total_amount', type: 'bigint' })
  totalAmount: string;

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: BookingRequestStatus;

  // Scanned every half hour by the hold-expiry sweep.
  @Index({ where: `status = 'pending'` })
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
