import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../../users/entities/user.entity.js';
import { Review } from '../../entities/review.entity.js';

import type { Relation } from 'typeorm';

// Outcome table: INSERT-only, one timestamp, no nullable column.
// (pending → rejected)
@Entity('review_rejections')
export class ReviewRejection {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'review_id', type: 'bigint', unique: true })
  reviewId: string;

  @OneToOne(() => Review, (review) => review.rejection)
  @JoinColumn({ name: 'review_id' })
  review: Relation<Review>;

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
