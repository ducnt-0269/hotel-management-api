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

import { BookingRequest } from '../../booking-requests/entities/booking-request.entity.js';

import type { Relation } from 'typeorm';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

// A long-term event: inserted once, afterwards only `status` changes, and
// only together with a row in the matching outcome table.
@Entity('reviews')
@Check('reviews_rating_check', 'rating BETWEEN 1 AND 5')
@Check('reviews_status_check', `status IN ('pending', 'approved', 'rejected')`)
export class Review {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'booking_request_id', type: 'bigint', unique: true })
  bookingRequestId: string;

  @ManyToOne(() => BookingRequest)
  @JoinColumn({ name: 'booking_request_id' })
  bookingRequest: Relation<BookingRequest>;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text' })
  comment: string;

  // Serves the admin moderation queue.
  @Index({ where: `status = 'pending'` })
  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: ReviewStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
