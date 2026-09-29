import { UserEmailVerification } from '../../auth/entities/user-email-verification.entity.js';
import { hashPassword } from '../../common/security/password.js';
import { UserDeactivation } from '../../users/deactivation/entities/user-deactivation.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { USERS } from './users.seed-data.js';

import type { UserSeed } from './users.seed-data.js';
import type { DataSource, EntityManager } from 'typeorm';

// Local and demo only: every seeded account shares this password.
const SEED_PASSWORD = 'Password123';

// Writes the user with its final status plus the outcome rows that status is
// a projection of, so a seeded account looks exactly like one that went
// through register → activate → deactivate.
async function insertUser(
  manager: EntityManager,
  row: UserSeed,
  passwordHash: string,
  admin: User | null,
): Promise<User> {
  const user = await manager.save(
    manager.create(User, {
      email: row.email,
      passwordHash,
      fullName: row.fullName,
      role: row.role,
      status: row.status,
    }),
  );

  if (row.status !== 'unverified') {
    await manager.insert(UserEmailVerification, { userId: user.id });
  }
  if (row.status === 'deactivated') {
    if (!admin) throw new Error('A deactivated seed user needs an admin first');
    await manager.insert(UserDeactivation, {
      userId: user.id,
      adminUserId: admin.id,
    });
  }
  return user;
}

// Never overwrites a row already there, so edits to a seeded database survive.
export async function seedUsers(dataSource: DataSource): Promise<void> {
  const users = dataSource.getRepository(User);
  const passwordHash = await hashPassword(SEED_PASSWORD);
  let admin: User | null = null;
  let seeded = 0;
  let skipped = 0;

  for (const row of USERS) {
    let user = await users.findOneBy({ email: row.email });
    if (user) {
      console.log(`skipped  ${row.email}`);
      skipped += 1;
    } else {
      user = await dataSource.transaction((manager) =>
        insertUser(manager, row, passwordHash, admin),
      );
      console.log(`seeded   ${row.email} (${row.role}, ${row.status})`);
      seeded += 1;
    }
    if (row.role === 'admin') admin ??= user;
  }

  console.log(
    `users: ${seeded} seeded, ${skipped} skipped — password for all: ${SEED_PASSWORD}`,
  );
}
