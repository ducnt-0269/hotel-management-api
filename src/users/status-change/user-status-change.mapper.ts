import type { UserDeactivation } from './user-deactivation.entity.js';
import type { UserReactivation } from './user-reactivation.entity.js';
import type { UserStatusChangeResponse } from './user-status-change.schema.js';

export function toUserStatusChangeResponse(
  change: UserDeactivation | UserReactivation,
): UserStatusChangeResponse {
  return {
    userId: Number(change.userId),
    adminUserId: Number(change.adminUserId),
    createdAt: change.createdAt,
  };
}
