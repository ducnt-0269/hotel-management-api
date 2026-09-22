import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { DataSource } from 'typeorm';

import { hashPassword } from '../../../src/common/security/password.js';
import { User } from '../../../src/users/entities/user.entity.js';

import type {
  UserRole,
  UserStatus,
} from '../../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

export const DEFAULT_PASSWORD = 'Password123';

export interface UserAttributes {
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
  status: UserStatus;
}

export const userAttributes = Factory.define<UserAttributes>(
  ({ sequence }) => ({
    email: `user${sequence}-${faker.string.alphanumeric(6).toLowerCase()}@example.com`,
    fullName: faker.person.fullName(),
    password: DEFAULT_PASSWORD,
    role: 'user',
    status: 'active',
  }),
);

// Persists a ready-to-use (active by default) user, skipping the register →
// activate path for tests that are not about it.
export async function createUser(
  app: INestApplication,
  overrides: Partial<UserAttributes> = {},
): Promise<User & { password: string }> {
  const attributes = userAttributes.build(overrides);
  const users = app.get(DataSource).getRepository(User);

  const user = await users.save(
    users.create({
      email: attributes.email.toLowerCase(),
      passwordHash: await hashPassword(attributes.password),
      fullName: attributes.fullName,
      role: attributes.role,
      status: attributes.status,
    }),
  );

  return Object.assign(user, { password: attributes.password });
}
