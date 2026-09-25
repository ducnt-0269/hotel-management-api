import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BookingRequest } from '../booking-requests/entities/booking-request.entity.js';
import { isUniqueViolation } from '../database/is-unique-violation.js';
import { StripeCheckoutService } from '../stripe/stripe-checkout.service.js';
import { PaymentSession } from './entities/payment-session.entity.js';
import { toPaymentSessionResponse } from './payment-session.mapper.js';
import { Payment } from './payment/entities/payment.entity.js';

import type { User } from '../users/entities/user.entity.js';
import type {
  CreatePaymentSessionBody,
  PaymentSessionResponse,
} from './schemas/payment-session.schema.js';

@Injectable()
export class PaymentSessionsService {
  constructor(
    @InjectRepository(BookingRequest)
    private readonly bookingRequestsRepository: Repository<BookingRequest>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(PaymentSession)
    private readonly paymentSessionsRepository: Repository<PaymentSession>,
    private readonly stripeCheckoutService: StripeCheckoutService,
  ) {}

  async open(
    user: User,
    { bookingRequestId }: CreatePaymentSessionBody,
  ): Promise<PaymentSessionResponse> {
    const bookingRequest = await this.findPayableBookingRequest(
      user,
      bookingRequestId,
    );
    // Open session before payment, never after: the webhook closes the one and
    // inserts the other in a single transaction, so this order leaves no gap
    // in which a just-paid request shows neither.
    const reusable = await this.findReusableSession(bookingRequest.id);
    if (reusable) {
      return toPaymentSessionResponse(reusable);
    }
    await this.ensureNotPaid(bookingRequest.id);

    const paymentSession = await this.openNewSession(bookingRequest);
    return toPaymentSessionResponse(paymentSession);
  }

  private async findPayableBookingRequest(
    user: User,
    id: number,
  ): Promise<BookingRequest> {
    const bookingRequest = await this.bookingRequestsRepository.findOne({
      select: {
        id: true,
        status: true,
        totalAmount: true,
        roomType: { id: true, name: true },
      },
      where: { id: String(id), userId: user.id },
      relations: { roomType: true },
    });
    // Someone else's request is a 404, not a 403: its existence stays private.
    if (!bookingRequest) {
      throw new NotFoundException('Booking request not found');
    }
    if (bookingRequest.status !== 'approved') {
      throw new ConflictException('Booking request is not approved');
    }
    return bookingRequest;
  }

  // The request's open session, if its link can still be paid.
  private async findReusableSession(
    bookingRequestId: string,
  ): Promise<Pick<PaymentSession, 'url' | 'expiresAt'> | null> {
    const openSession = await this.paymentSessionsRepository.findOne({
      select: { url: true, expiresAt: true },
      where: { bookingRequestId, status: 'open' },
    });
    // Expired at Stripe, but its webhook has not landed yet.
    if (openSession && openSession.expiresAt <= new Date()) {
      throw new ConflictException(
        'Previous payment session has not closed yet, try again later',
      );
    }
    return openSession;
  }

  private async ensureNotPaid(bookingRequestId: string): Promise<void> {
    if (await this.paymentsRepository.existsBy({ bookingRequestId })) {
      throw new ConflictException('Booking request is already paid');
    }
  }

  private async openNewSession(
    bookingRequest: BookingRequest,
  ): Promise<PaymentSession> {
    const checkout = await this.stripeCheckoutService.createSession({
      amount: Number(bookingRequest.totalAmount),
      description: `Booking request #${bookingRequest.id} · ${bookingRequest.roomType.name}`,
      metadata: { bookingRequestId: bookingRequest.id },
    });
    try {
      return await this.paymentSessionsRepository.save({
        bookingRequestId: bookingRequest.id,
        stripeSessionId: checkout.id,
        url: checkout.url,
        amount: bookingRequest.totalAmount,
        expiresAt: checkout.expiresAt,
      });
    } catch (error) {
      // A concurrent call won; this link was never handed out and expires.
      if (isUniqueViolation(error)) {
        throw new ConflictException('A payment session is already open');
      }
      throw error;
    }
  }
}
