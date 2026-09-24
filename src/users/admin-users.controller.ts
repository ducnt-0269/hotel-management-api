import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
import {
  listUsersQuerySchema,
  userIdParamSchema,
  userListResponseSchema,
  userResponseSchema,
  userStatusChangeResponseSchema,
} from './schemas/user.schema.js';
import { UserManagementService } from './user-management.service.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type { User } from './entities/user.entity.js';
import type {
  ListUsersQuery,
  UserResponse,
  UserStatusChangeResponse,
} from './schemas/user.schema.js';

@ApiBearerAuth()
@Roles('admin')
@ApiErrorResponse(403, 'Forbidden')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Get()
  @RespondsWith(userListResponseSchema, {
    status: 200,
    description: 'Accounts, newest first',
  })
  list(
    @Query({ schema: listUsersQuerySchema }) query: ListUsersQuery,
  ): Promise<Paginated<UserResponse>> {
    return this.userManagementService.list(query);
  }

  @Get(':id')
  @RespondsWith(userResponseSchema, { status: 200, description: 'One account' })
  @ApiErrorResponse(404, 'User not found')
  findOne(
    @Param('id', { schema: userIdParamSchema }) id: number,
  ): Promise<UserResponse> {
    return this.userManagementService.findOne(id);
  }

  @Post(':id/deactivation')
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
    return this.userManagementService.deactivate(admin, id);
  }

  @Post(':id/reactivation')
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
    return this.userManagementService.reactivate(admin, id);
  }
}
