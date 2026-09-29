import { faker } from '@faker-js/faker';
import { DateTime } from 'luxon';

import {
  expirationOutcomeAt,
  paymentPaidAt,
  paymentSessionCreatedAt,
} from './booking-request-seed-timeline.js';
import { NO_OUTCOME } from './booking-request-seed-types.js';
import {
  REJECTION_REASONS,
  STRIPE_SESSION_ID_PREFIX,
} from './booking-request-seed.constants.js';
import { randomInstantBetween } from './seed-random-time.js';

import type {
  GeneratedBookingRequest,
  PastOutcomeKind,
  PlacedCandidate,
} from './booking-request-seed-types.js';

type BaseRequest = PlacedCandidate & {
  approval: null;
  rejection: null;
  cancellation: null;
  expiration: null;
  session: null;
  payment: null;
  createdAt: Date;
  expiresAt: Date;
};

// One `cs_seed_0001`-style id per call, unique across the whole run.
export function stripeSessionIdSequence(): () => string {
  let counter = 0;
  return () =>
    `${STRIPE_SESSION_ID_PREFIX}${String(++counter).padStart(4, '0')}`;
}

// A resolved past request: parent row plus exactly the outcome row(s) its
// final status projects.
export function buildPastOutcome(
  kind: PastOutcomeKind,
  candidate: PlacedCandidate,
  adminUserId: string,
  requestCreatedAt: Date,
  requestExpiresAt: Date,
  nextStripeSessionId: () => string,
): GeneratedBookingRequest {
  const base: BaseRequest = {
    ...candidate,
    ...NO_OUTCOME,
    createdAt: requestCreatedAt,
    expiresAt: requestExpiresAt,
  };

  switch (kind) {
    case 'approved-paid':
      return buildApprovedPaid(base, adminUserId, nextStripeSessionId());
    case 'approved-unpaid': {
      const approvedAt = randomInstantBetween(
        requestCreatedAt,
        requestExpiresAt,
      );
      return {
        ...base,
        status: 'approved',
        updatedAt: approvedAt,
        approval: { adminUserId, createdAt: approvedAt },
      };
    }
    case 'rejected': {
      const rejectedAt = randomInstantBetween(
        requestCreatedAt,
        requestExpiresAt,
      );
      return {
        ...base,
        status: 'rejected',
        updatedAt: rejectedAt,
        rejection: {
          adminUserId,
          reason: faker.helpers.arrayElement(REJECTION_REASONS),
          createdAt: rejectedAt,
        },
      };
    }
    case 'cancelled': {
      const cancelledAt = randomInstantBetween(
        requestCreatedAt,
        requestExpiresAt,
      );
      return {
        ...base,
        status: 'cancelled',
        updatedAt: cancelledAt,
        cancellation: { createdAt: cancelledAt },
      };
    }
    case 'expired': {
      const expiredAt = expirationOutcomeAt(requestExpiresAt);
      return {
        ...base,
        status: 'expired',
        updatedAt: expiredAt,
        expiration: { createdAt: expiredAt },
      };
    }
  }

  // Approval, Stripe Checkout and the payment webhook, in order: t1 < t2 <
  // t3, all still before check-in.
  function buildApprovedPaid(
    withoutOutcome: BaseRequest,
    admin: string,
    stripeSessionId: string,
  ): GeneratedBookingRequest {
    const approvedAt = randomInstantBetween(requestCreatedAt, requestExpiresAt);
    const sessionCreatedAt = paymentSessionCreatedAt(
      approvedAt,
      candidate.checkInDate,
    );
    const paidAt = paymentPaidAt(sessionCreatedAt, candidate.checkInDate);
    return {
      ...withoutOutcome,
      status: 'approved',
      updatedAt: approvedAt,
      approval: { adminUserId: admin, createdAt: approvedAt },
      session: {
        stripeSessionId,
        url: `https://checkout.stripe.com/c/pay/${stripeSessionId}`,
        amount: candidate.totalAmount,
        createdAt: sessionCreatedAt,
        expiresAt: DateTime.fromJSDate(sessionCreatedAt)
          .plus({ hours: 24 })
          .toJSDate(),
      },
      payment: { amount: candidate.totalAmount, paidAt, createdAt: paidAt },
    };
  }
}
