import { In } from 'typeorm';

import { Payment } from '../payment-sessions/payment/entities/payment.entity.js';
import { BookingRequestRejection } from './rejection/entities/booking-request-rejection.entity.js';

import type { EntityManager } from 'typeorm';

// Outcome rows for a page of requests, one query per table. Each table holds
// at most one row per request (UNIQUE on booking_request_id).
export function findBookingRequestOutcomes(
  manager: EntityManager,
  bookingRequestIds: string[],
): Promise<[Payment[], BookingRequestRejection[]]> {
  return Promise.all([
    findPayments(manager, bookingRequestIds),
    findRejections(manager, bookingRequestIds),
  ]);
}

async function findPayments(
  manager: EntityManager,
  bookingRequestIds: string[],
): Promise<Payment[]> {
  if (bookingRequestIds.length === 0) return [];
  return manager.find(Payment, {
    select: { bookingRequestId: true, amount: true, paidAt: true },
    where: { bookingRequestId: In(bookingRequestIds) },
  });
}

async function findRejections(
  manager: EntityManager,
  bookingRequestIds: string[],
): Promise<BookingRequestRejection[]> {
  if (bookingRequestIds.length === 0) return [];
  return manager.find(BookingRequestRejection, {
    select: { bookingRequestId: true, reason: true, createdAt: true },
    where: { bookingRequestId: In(bookingRequestIds) },
  });
}
