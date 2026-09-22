import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type UserRole = 'user' | 'admin';
export type UserStatus = 'unverified' | 'active' | 'deactivated';

// Enums are varchar + CHECK, never Postgres native enums (database-design §6).
@Entity('users')
@Check('users_role_check', `role IN ('user', 'admin')`)
@Check(
  'users_status_check',
  `status IN ('unverified', 'active', 'deactivated')`,
)
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  // Stored lower-cased; see the `## Deviations` row in database-design.md.
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  fullName: string;

  @Column({ type: 'varchar', length: 10 })
  role: UserRole;

  // Projection of the outcome tables; read by JwtStrategy on every request.
  @Index()
  @Column({ type: 'varchar', length: 12, default: 'unverified' })
  status: UserStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
