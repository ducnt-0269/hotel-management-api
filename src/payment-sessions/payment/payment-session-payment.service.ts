import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { PaymentSession } from '../entities/payment-session.entity.js';
import { Payment } from './entities/payment.entity.js';

import type Stripe from 'stripe';

// open → completed, driven by the `checkout.session.completed` webhook.
@Injectable()
export class PaymentSessionPaymentService {
  private readonly logger = new Logger(PaymentSessionPaymentService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async complete(
    session: Stripe.Checkout.Session,
    paidAt: Date,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const paymentSession = await manager.findOne(PaymentSession, {
        select: { id: true, bookingRequestId: true },
        where: { stripeSessionId: session.id },
      });
      if (!paymentSession) {
        this.logger.warn(`No payment session for Stripe session ${session.id}`);
        return;
      }

      // UPDATE before INSERT: a repeated delivery stops at the `open` guard
      // instead of hitting the UNIQUE on payments.
      const { affected } = await manager.update(
        PaymentSession,
        { id: paymentSession.id, status: 'open' },
        { status: 'completed' },
      );
      if (affected !== 1) {
        this.logger.warn(`Payment session ${paymentSession.id} is not open`);
        return;
      }

      // What Stripe took, not what was asked.
      await manager.insert(Payment, {
        paymentSessionId: paymentSession.id,
        bookingRequestId: paymentSession.bookingRequestId,
        amount: String(session.amount_total),
        paidAt,
      });
    });
  }
}
