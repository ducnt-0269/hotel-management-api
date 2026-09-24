import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
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

import type { UserResponse } from '../users/schemas/user.schema.js';
import type { LoginBody, RegisterBody } from './schemas/auth.schema.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly accountActivationService: AccountActivationService,
  ) {}

  @Public()
  @Post('register')
  @RespondsWith(userResponseSchema, {
    status: 201,
    description: 'Account created, unverified; the activation mail is queued',
  })
  @ApiErrorResponse(409, 'Email is already registered')
  register(
    @Body({ schema: registerBodySchema }) body: RegisterBody,
    // The activation mail is written in the language the request asked for.
    @I18nLang() lang: string,
  ): Promise<UserResponse> {
    return this.authService.register(body, lang);
  }

  // GET because it is the link in the activation email (api-list row 2).
  @Public()
  @Get('activate')
  @RespondsWith(userResponseSchema, {
    status: 200,
    description: 'Account activated',
  })
  @ApiErrorResponse(400, 'Token is missing')
  @ApiErrorResponse(404, 'Unknown activation token')
  @ApiErrorResponse(
    409,
    'Token has expired, or the account is not awaiting activation',
  )
  activate(
    @Query({ schema: activateQuerySchema }) { token }: { token: string },
  ): Promise<UserResponse> {
    return this.accountActivationService.activate(token);
  }

  @Public()
  @Post('login')
  @RespondsWith(authResponseSchema, {
    status: 200,
    description: 'Signed in; returns an access token',
  })
  @ApiErrorResponse(401, 'Invalid email or password')
  @ApiErrorResponse(403, 'Account has not been activated, or is deactivated')
  @HttpCode(200)
  login(@Body({ schema: loginBodySchema }) body: LoginBody) {
    return this.authService.login(body);
  }

  // Stateless: the client drops the token.
  @Post('logout')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiNoContentResponse({ description: 'Signed out' })
  logout(): void {}
}
