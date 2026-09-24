import { SetMetadata } from '@nestjs/common';

import type { UserRole } from '../../users/entities/user.entity.js';

// Read by RolesGuard. A route without it is open to every signed-in role.
export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
