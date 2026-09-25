import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PaymentSession } from '../../entities/payment-session.entity.js';

// Outcome table: INSERT-only, one timestamp, no nullable column.
@Entity('payment_session_expirations')
export class PaymentSessionExpiration {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'payment_session_id', type: 'bigint', unique: true })
  paymentSessionId: string;

  @ManyToOne(() => PaymentSession)
  @JoinColumn({ name: 'payment_session_id' })
  paymentSession: PaymentSession;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
