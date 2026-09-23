import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { User } from '../users/entities/user.entity.js';
import { toUserResponse } from '../users/user.mapper.js';
import {
  activationTokenExpiry,
  generateActivationToken,
  hashActivationToken,
} from './activation-token.js';
import { UserEmailVerificationToken } from './entities/user-email-verification-token.entity.js';
import { UserEmailVerification } from './entities/user-email-verification.entity.js';

import type { UserResponse } from '../users/schemas/user.schema.js';

@Injectable()
export class AccountActivationService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // Runs inside the caller's registration transaction; returns the raw token,
  // which only the email ever sees.
  async issueToken(manager: EntityManager, user: User): Promise<string> {
    const raw = generateActivationToken();
    await manager.insert(UserEmailVerificationToken, {
      userId: user.id,
      tokenHash: hashActivationToken(raw),
      expiresAt: activationTokenExpiry(),
    });
    return raw;
  }

  async activate(rawToken: string): Promise<UserResponse> {
    const tokenHash = hashActivationToken(rawToken);

    return this.dataSource.transaction(async (manager) => {
      const token = await manager.findOneBy(UserEmailVerificationToken, {
        tokenHash,
      });
      if (!token) throw new NotFoundException('Unknown activation token');
      if (token.expiresAt.getTime() <= Date.now()) {
        throw new ConflictException('Activation token has expired');
      }

      // The guarded UPDATE runs first so a concurrent activation blocks on the
      // users row lock and then finds the predicate false (→ 409), instead of
      // racing into the UNIQUE index on user_email_verifications (→ 23505 → 500).
      // Both statements stay in one transaction, so status never moves without
      // its outcome row.
      const updated = await manager.update(
        User,
        { id: token.userId, status: 'unverified' },
        { status: 'active' },
      );
      if (updated.affected !== 1) {
        throw new ConflictException('Account is not awaiting activation');
      }
      await manager.insert(UserEmailVerification, { userId: token.userId });
      await manager.delete(UserEmailVerificationToken, { id: token.id });

      return toUserResponse(
        await manager.findOneByOrFail(User, { id: token.userId }),
      );
    });
  }
}
