import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  SerializeOptions,
} from '@nestjs/common';

import { userResponseSchema } from '../users/schemas/user.schema.js';
import { AccountActivationService } from './account-activation.service.js';
import { AuthService } from './auth.service.js';
import { Public } from './decorators/public.decorator.js';
import {
  activateQuerySchema,
  authResponseSchema,
  loginBodySchema,
  registerBodySchema,
} from './schemas/auth.schema.js';

import type { User } from '../users/entities/user.entity.js';
import type { LoginBody, RegisterBody } from './schemas/auth.schema.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly accountActivationService: AccountActivationService,
  ) {}

  @Public()
  @Post('register')
  @SerializeOptions({ schema: userResponseSchema })
  register(
    @Body({ schema: registerBodySchema }) body: RegisterBody,
  ): Promise<User> {
    return this.authService.register(body);
  }

  // GET because it is the link in the activation email (api-list row 2).
  @Public()
  @Get('activate')
  @SerializeOptions({ schema: userResponseSchema })
  activate(
    @Query({ schema: activateQuerySchema }) { token }: { token: string },
  ): Promise<User> {
    return this.accountActivationService.activate(token);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @SerializeOptions({ schema: authResponseSchema })
  login(@Body({ schema: loginBodySchema }) body: LoginBody) {
    return this.authService.login(body);
  }

  // Stateless: the client drops the token.
  @Post('logout')
  @HttpCode(204)
  logout(): void {}
}
