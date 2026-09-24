import { Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../../common/api-docs/api-error-response.decorator.js';
import { RespondsWith } from '../../common/api-docs/responds-with.decorator.js';
import { userIdParamSchema } from '../schemas/user.schema.js';
import { AdminUserStatusChangeService } from './admin-user-status-change.service.js';
import { userStatusChangeResponseSchema } from './user-status-change.schema.js';

import type { User } from '../entities/user.entity.js';
import type { UserStatusChangeResponse } from './user-status-change.schema.js';

@ApiBearerAuth()
@Roles('admin')
@ApiErrorResponse(403, 'Forbidden')
@Controller('admin/users/:id')
export class AdminUserStatusChangeController {
  constructor(
    private readonly adminUserStatusChangeService: AdminUserStatusChangeService,
  ) {}

  @Post('deactivation')
  @RespondsWith(userStatusChangeResponseSchema, {
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
  ): Promise<UserStatusChangeResponse> {
    return this.adminUserStatusChangeService.deactivate(admin, id);
  }

  @Post('reactivation')
  @RespondsWith(userStatusChangeResponseSchema, {
    status: 201,
    description: 'Account active again',
  })
  @ApiErrorResponse(404, 'User not found')
  @ApiErrorResponse(409, 'User is not deactivated')
  reactivate(
    @CurrentUser() admin: User,
    @Param('id', { schema: userIdParamSchema }) id: number,
  ): Promise<UserStatusChangeResponse> {
    return this.adminUserStatusChangeService.reactivate(admin, id);
  }
}
