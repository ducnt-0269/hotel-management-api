import type { UserDeactivation } from './entities/user-deactivation.entity.js';
import type { UserDeactivationResponse } from './schemas/user-deactivation.schema.js';

export function toUserDeactivationResponse(
  deactivation: UserDeactivation,
): UserDeactivationResponse {
  return {
    userId: Number(deactivation.userId),
    adminUserId: Number(deactivation.adminUserId),
    createdAt: deactivation.createdAt,
  };
}
