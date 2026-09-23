import { Body, Controller, Get, HttpCode, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
import {
  changePasswordBodySchema,
  updateProfileBodySchema,
  userResponseSchema,
} from './schemas/user.schema.js';
import { toUserResponse } from './user.mapper.js';
import { UsersService } from './users.service.js';

import type { User } from './entities/user.entity.js';
import type {
  ChangePasswordBody,
  UpdateProfileBody,
  UserResponse,
} from './schemas/user.schema.js';

@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RespondsWith(userResponseSchema, {
    status: 200,
    description: 'The signed-in user',
  })
  profile(@CurrentUser() user: User): UserResponse {
    return toUserResponse(user);
  }

  @Patch()
  @RespondsWith(userResponseSchema, {
    status: 200,
    description: 'Profile updated',
  })
  updateProfile(
    @CurrentUser() user: User,
    @Body({ schema: updateProfileBodySchema }) body: UpdateProfileBody,
  ): Promise<UserResponse> {
    return this.usersService.updateProfile(user, body);
  }

  @Put('password')
  @ApiNoContentResponse({ description: 'Password changed' })
  @ApiErrorResponse(
    401,
    'Missing or invalid token, or the current password is wrong',
  )
  @HttpCode(204)
  changePassword(
    @CurrentUser() user: User,
    @Body({ schema: changePasswordBodySchema }) body: ChangePasswordBody,
  ): Promise<void> {
    return this.usersService.changePassword(user, body);
  }
}
