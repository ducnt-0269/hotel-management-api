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

// Outcome table: INSERT-only, one timestamp, no nullable column.
// (pending → approved)
@Entity('review_approvals')
export class ReviewApproval {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'review_id', type: 'bigint', unique: true })
  reviewId: string;

  @OneToOne(() => Review)
  @JoinColumn({ name: 'review_id' })
  review: Review;

  @Index()
  @Column({ name: 'admin_user_id', type: 'bigint' })
  adminUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'admin_user_id' })
  adminUser: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
