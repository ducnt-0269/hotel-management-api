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

import { BookingRequest } from '../../../booking-requests/entities/booking-request.entity.js';
import { PaymentSession } from '../../entities/payment-session.entity.js';

// Outcome table: INSERT-only, no nullable column; revenue is counted here.
// `booking_request_id` repeats the session's so a request is never paid twice.
@Entity('payments')
@Check('payments_amount_check', 'amount > 0')
export class Payment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'payment_session_id', type: 'bigint', unique: true })
  paymentSessionId: string;

  @ManyToOne(() => PaymentSession)
  @JoinColumn({ name: 'payment_session_id' })
  paymentSession: PaymentSession;

  @Column({ name: 'booking_request_id', type: 'bigint', unique: true })
  bookingRequestId: string;

  @ManyToOne(() => BookingRequest)
  @JoinColumn({ name: 'booking_request_id' })
  bookingRequest: BookingRequest;

  @Column({ type: 'bigint' })
  amount: string;

  // When Stripe took the money; `created_at` is when the webhook arrived.
  @Index()
  @Column({ name: 'paid_at', type: 'timestamptz' })
  paidAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
