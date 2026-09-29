import type { User } from './entities/user.entity.js';
import type { UserResponse, UserSummary } from './schemas/user.schema.js';
import type { FindOptionsSelect } from 'typeorm';

// Picks fields one by one, so `passwordHash` can never reach a response. `id`
// is a bigint the driver hands back as a string; ids leave as integers.
export function toUserResponse(user: User): UserResponse {
  return {
    id: Number(user.id),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

// Exactly the columns `toUserSummary` reads.
export const userSummaryColumns: FindOptionsSelect<User> = {
  id: true,
  email: true,
  fullName: true,
};

export function toUserSummary(
  user: Pick<User, 'id' | 'email' | 'fullName'>,
): UserSummary {
  return { id: Number(user.id), email: user.email, fullName: user.fullName };
}
