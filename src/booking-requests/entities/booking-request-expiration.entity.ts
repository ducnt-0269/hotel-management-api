import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { BookingRequest } from './booking-request.entity.js';

// Outcome table: INSERT-only, one timestamp, no nullable column. No actor —
// expiry is always the system's (pending → expired).
@Entity('booking_request_expirations')
export class BookingRequestExpiration {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'booking_request_id', type: 'bigint', unique: true })
  bookingRequestId: string;

  @ManyToOne(() => BookingRequest)
  @JoinColumn({ name: 'booking_request_id' })
  bookingRequest: BookingRequest;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
