import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../../users/entities/user.entity.js';
import { BookingRequest } from '../../entities/booking-request.entity.js';

// Outcome table: INSERT-only, one timestamp, no nullable column.
// (pending → rejected)
@Entity('booking_request_rejections')
export class BookingRequestRejection {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'booking_request_id', type: 'bigint', unique: true })
  bookingRequestId: string;

  @ManyToOne(() => BookingRequest)
  @JoinColumn({ name: 'booking_request_id' })
  bookingRequest: BookingRequest;

  @Index()
  @Column({ name: 'admin_user_id', type: 'bigint' })
  adminUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'admin_user_id' })
  adminUser: User;

  // Shown to the guest; never blank (checked by the request schema).
  @Column({ type: 'text' })
  reason: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
