import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity.js';

@Entity('user_email_verification_tokens')
export class UserEmailVerificationToken {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  // One live token per user. Re-issuing is not implemented; when it is, it
  // must delete or upsert this row — a plain INSERT would raise 23505.
  @Column({ name: 'user_id', type: 'bigint', unique: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
