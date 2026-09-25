import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { PaymentSession } from '../entities/payment-session.entity.js';
import { PaymentSessionExpiration } from './entities/payment-session-expiration.entity.js';

// open → expired, driven by the `checkout.session.expired` webhook.
@Injectable()
export class PaymentSessionExpirationService {
  private readonly logger = new Logger(PaymentSessionExpirationService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async expire(stripeSessionId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const paymentSession = await manager.findOne(PaymentSession, {
        select: { id: true },
        where: { stripeSessionId },
      });
      if (!paymentSession) {
        this.logger.warn(
          `No payment session for Stripe session ${stripeSessionId}`,
        );
        return;
      }

      // A repeated delivery stops at the `open` guard.
      const { affected } = await manager.update(
        PaymentSession,
        { id: paymentSession.id, status: 'open' },
        { status: 'expired' },
      );
      if (affected !== 1) {
        this.logger.warn(`Payment session ${paymentSession.id} is not open`);
        return;
      }
      await manager.insert(PaymentSessionExpiration, {
        paymentSessionId: paymentSession.id,
      });
    });
  }
}
