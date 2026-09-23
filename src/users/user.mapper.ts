import type { User } from './entities/user.entity.js';
import type { UserResponse } from './schemas/user.schema.js';

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
