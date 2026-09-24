import { Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../../common/api-docs/api-error-response.decorator.js';
import { RespondsWith } from '../../common/api-docs/responds-with.decorator.js';
import { userIdParamSchema } from '../schemas/user.schema.js';
import { AdminUserReactivationService } from './admin-user-reactivation.service.js';
import { userReactivationResponseSchema } from './schemas/user-reactivation.schema.js';

import type { User } from '../entities/user.entity.js';
import type { UserReactivationResponse } from './schemas/user-reactivation.schema.js';

@ApiBearerAuth()
@Roles('admin')
@ApiErrorResponse(403, 'Forbidden')
@Controller('admin/users/:id/reactivation')
export class AdminUserReactivationController {
  constructor(
    private readonly adminUserReactivationService: AdminUserReactivationService,
  ) {}

  @Post()
  @RespondsWith(userReactivationResponseSchema, {
    status: 201,
    description: 'Account active again',
  })
  @ApiErrorResponse(404, 'User not found')
  @ApiErrorResponse(409, 'User is not deactivated')
  reactivate(
    @CurrentUser() admin: User,
    @Param('id', { schema: userIdParamSchema }) id: number,
  ): Promise<UserReactivationResponse> {
    return this.adminUserReactivationService.reactivate(admin, id);
  }
}
