import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { BookingRequest } from '../../entities/booking-request.entity.js';

// Outcome table: INSERT-only, one timestamp, no nullable column. No actor —
// the guest who raised the request is the only one who can cancel it
// (pending → cancelled).
@Entity('booking_request_cancellations')
export class BookingRequestCancellation {
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
