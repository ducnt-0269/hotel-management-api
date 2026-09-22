import { createParamDecorator } from '@nestjs/common';

import type { User } from '../../users/entities/user.entity.js';
import type { ExecutionContext } from '@nestjs/common';

// The user JwtStrategy.validate() put on the request.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    context.switchToHttp().getRequest<{ user: User }>().user,
);
