import type { UserReactivation } from './entities/user-reactivation.entity.js';
import type { UserReactivationResponse } from './schemas/user-reactivation.schema.js';

export function toUserReactivationResponse(
  reactivation: UserReactivation,
): UserReactivationResponse {
  return {
    userId: Number(reactivation.userId),
    adminUserId: Number(reactivation.adminUserId),
    createdAt: reactivation.createdAt,
  };
}
