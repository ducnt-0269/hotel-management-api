import { User } from './entities/user.entity.js';

import type { EntityManager } from 'typeorm';

// JwtStrategy refuses any token signed with an older version, so this ends
// every session the user has. Incremented in SQL so concurrent calls never
// undo each other.
export async function revokeUserTokens(
  manager: EntityManager,
  userId: string,
): Promise<void> {
  await manager.update(User, userId, {
    tokenVersion: () => 'token_version + 1',
  });
}
