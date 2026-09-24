import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
import { AdminUsersService } from './admin-users.service.js';
import {
  listUsersQuerySchema,
  userIdParamSchema,
  userListResponseSchema,
  userResponseSchema,
} from './schemas/user.schema.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type { ListUsersQuery, UserResponse } from './schemas/user.schema.js';

@ApiBearerAuth()
@Roles('admin')
@ApiErrorResponse(403, 'Forbidden')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @RespondsWith(userListResponseSchema, {
    status: 200,
    description: 'Accounts, newest first',
  })
  list(
    @Query({ schema: listUsersQuerySchema }) query: ListUsersQuery,
  ): Promise<Paginated<UserResponse>> {
    return this.adminUsersService.list(query);
  }

  @Get(':id')
  @RespondsWith(userResponseSchema, { status: 200, description: 'One account' })
  @ApiErrorResponse(404, 'User not found')
  findOne(
    @Param('id', { schema: userIdParamSchema }) id: number,
  ): Promise<UserResponse> {
    return this.adminUsersService.findOne(id);
  }
}
