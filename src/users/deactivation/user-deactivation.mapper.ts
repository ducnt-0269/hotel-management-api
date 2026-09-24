import type { UserDeactivation } from './user-deactivation.entity.js';
import type { UserDeactivationResponse } from './user-deactivation.schema.js';

export function toUserDeactivationResponse(
  deactivation: UserDeactivation,
): UserDeactivationResponse {
  return {
    userId: Number(deactivation.userId),
    adminUserId: Number(deactivation.adminUserId),
    createdAt: deactivation.createdAt,
  };
}
