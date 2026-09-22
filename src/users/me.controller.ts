import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Put,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import {
  changePasswordBodySchema,
  updateProfileBodySchema,
  userResponseSchema,
} from './schemas/user.schema.js';
import { UsersService } from './users.service.js';

import type { User } from './entities/user.entity.js';
import type {
  ChangePasswordBody,
  UpdateProfileBody,
} from './schemas/user.schema.js';

@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @SerializeOptions({ schema: userResponseSchema })
  profile(@CurrentUser() user: User): User {
    return user;
  }

  @Patch()
  @ApiOkResponse({ description: 'Profile updated' })
  @SerializeOptions({ schema: userResponseSchema })
  updateProfile(
    @CurrentUser() user: User,
    @Body({ schema: updateProfileBodySchema }) body: UpdateProfileBody,
  ): Promise<User> {
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
