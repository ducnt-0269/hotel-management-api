import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { BookingRequest } from '../../booking-requests/entities/booking-request.entity.js';

export type PaymentSessionStatus = 'open' | 'completed' | 'expired';

// A long-term event: one Stripe Checkout Session. Only `status` changes, and
// only with a row in `payments` or `payment_session_expirations`.
@Entity('payment_sessions')
@Check('payment_sessions_amount_check', 'amount > 0')
@Check(
  'payment_sessions_status_check',
  `status IN ('open', 'completed', 'expired')`,
)
// One live link per request, so a guest cannot pay twice.
@Index(['bookingRequestId'], { unique: true, where: `status = 'open'` })
export class PaymentSession {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'booking_request_id', type: 'bigint' })
  bookingRequestId: string;

  @ManyToOne(() => BookingRequest)
  @JoinColumn({ name: 'booking_request_id' })
  bookingRequest: BookingRequest;

  @Column({
    name: 'stripe_session_id',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  stripeSessionId: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'varchar', length: 10, default: 'open' })
  status: PaymentSessionStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
