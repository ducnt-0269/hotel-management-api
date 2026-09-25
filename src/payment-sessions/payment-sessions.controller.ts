import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
import { PaymentSessionsService } from './payment-sessions.service.js';
import {
  createPaymentSessionBodySchema,
  paymentSessionResponseSchema,
} from './schemas/payment-session.schema.js';

import type { User } from '../users/entities/user.entity.js';
import type {
  CreatePaymentSessionBody,
  PaymentSessionResponse,
} from './schemas/payment-session.schema.js';

@ApiBearerAuth()
@Roles('user')
@ApiErrorResponse(403, 'Forbidden')
@Controller('payment-sessions')
export class PaymentSessionsController {
  constructor(
    private readonly paymentSessionsService: PaymentSessionsService,
  ) {}

  @Post()
  @RespondsWith(paymentSessionResponseSchema, {
    status: 201,
    description:
      'A payment link for the request: the one still open, or a new one',
  })
  @ApiErrorResponse(404, 'Booking request not found')
  @ApiErrorResponse(
    409,
    'Booking request is not approved or already paid, or another payment session is still open',
  )
  @ApiErrorResponse(502, 'Payment provider unavailable')
  create(
    @CurrentUser() user: User,
    @Body({ schema: createPaymentSessionBodySchema })
    body: CreatePaymentSessionBody,
  ): Promise<PaymentSessionResponse> {
    return this.paymentSessionsService.open(user, body);
  }
}
