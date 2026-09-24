import { Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../../common/api-docs/api-error-response.decorator.js';
import { RespondsWith } from '../../common/api-docs/responds-with.decorator.js';
import { userIdParamSchema } from '../schemas/user.schema.js';
import { AdminUserDeactivationService } from './admin-user-deactivation.service.js';
import { userDeactivationResponseSchema } from './schemas/user-deactivation.schema.js';

import type { User } from '../entities/user.entity.js';
import type { UserDeactivationResponse } from './schemas/user-deactivation.schema.js';

@ApiBearerAuth()
@Roles('admin')
@ApiErrorResponse(403, 'Forbidden')
@Controller('admin/users/:id/deactivation')
export class AdminUserDeactivationController {
  constructor(
    private readonly adminUserDeactivationService: AdminUserDeactivationService,
  ) {}

  @Post()
  @RespondsWith(userDeactivationResponseSchema, {
    status: 201,
    description: 'Account deactivated; its tokens stop working at once',
  })
  @ApiErrorResponse(404, 'User not found')
  @ApiErrorResponse(
    409,
    'User is not active, or you tried to deactivate your own account',
  )
  deactivate(
    @CurrentUser() admin: User,
    @Param('id', { schema: userIdParamSchema }) id: number,
  ): Promise<UserDeactivationResponse> {
    return this.adminUserDeactivationService.deactivate(admin, id);
  }
}
