import { BookingRequestApproval } from '../../booking-requests/approval/entities/booking-request-approval.entity.js';
import { BookingRequestCancellation } from '../../booking-requests/cancellation/entities/booking-request-cancellation.entity.js';
import { BookingRequest } from '../../booking-requests/entities/booking-request.entity.js';
import { BookingRequestExpiration } from '../../booking-requests/expiration/entities/booking-request-expiration.entity.js';
import { BookingRequestRejection } from '../../booking-requests/rejection/entities/booking-request-rejection.entity.js';
import { PaymentSession } from '../../payment-sessions/entities/payment-session.entity.js';
import { Payment } from '../../payment-sessions/payment/entities/payment.entity.js';
import { RoomType } from '../../room-types/entities/room-type.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { generateBookingRequests } from './booking-request.seed-data.js';

import type { GeneratedBookingRequest } from './booking-request.seed-data.js';
import type { DataSource, EntityManager } from 'typeorm';

// Guarded on the whole table, not per row: this seeder only ever runs once
// against an empty database, and a second run must change nothing.
export async function seedBookingRequests(
  dataSource: DataSource,
): Promise<void> {
  const bookingRequests = dataSource.getRepository(BookingRequest);
  if (await bookingRequests.exists()) {
    console.log('booking requests: skipped (already seeded)');
    return;
  }

  const guests = await dataSource
    .getRepository(User)
    .find({ select: { id: true }, where: { role: 'user', status: 'active' } });
  const admin = await dataSource
    .getRepository(User)
    .findOne({ select: { id: true }, where: { role: 'admin' } });
  const roomTypes = await dataSource
    .getRepository(RoomType)
    .find({ select: { id: true, pricePerNight: true, totalRooms: true } });

  if (guests.length === 0 || !admin || roomTypes.length === 0) {
    throw new Error(
      'booking-requests seeder needs the users and room-types seeders to run first',
    );
  }

  const generated = generateBookingRequests({
    guests,
    admin,
    roomTypes,
    now: new Date(),
  });
  for (const plan of generated) {
    await dataSource.transaction((manager) =>
      insertBookingRequest(manager, plan),
    );
  }

  console.log(
    `booking requests: ${generated.length} seeded — ${summarize(generated)}`,
  );
}

async function insertBookingRequest(
  manager: EntityManager,
  plan: GeneratedBookingRequest,
): Promise<void> {
  const bookingRequest = await manager.save(
    manager.create(BookingRequest, {
      userId: plan.userId,
      roomTypeId: plan.roomTypeId,
      roomsRequested: plan.roomsRequested,
      checkInDate: plan.checkInDate,
      checkOutDate: plan.checkOutDate,
      totalAmount: plan.totalAmount,
      status: plan.status,
      expiresAt: plan.expiresAt,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }),
  );

  if (plan.approval) {
    await manager.insert(BookingRequestApproval, {
      bookingRequestId: bookingRequest.id,
      adminUserId: plan.approval.adminUserId,
      createdAt: plan.approval.createdAt,
    });
  }
  if (plan.rejection) {
    await manager.insert(BookingRequestRejection, {
      bookingRequestId: bookingRequest.id,
      adminUserId: plan.rejection.adminUserId,
      reason: plan.rejection.reason,
      createdAt: plan.rejection.createdAt,
    });
  }
  if (plan.cancellation) {
    await manager.insert(BookingRequestCancellation, {
      bookingRequestId: bookingRequest.id,
      createdAt: plan.cancellation.createdAt,
    });
  }
  if (plan.expiration) {
    await manager.insert(BookingRequestExpiration, {
      bookingRequestId: bookingRequest.id,
      createdAt: plan.expiration.createdAt,
    });
  }
  if (plan.session) {
    const session = await manager.save(
      manager.create(PaymentSession, {
        bookingRequestId: bookingRequest.id,
        stripeSessionId: plan.session.stripeSessionId,
        url: plan.session.url,
        amount: plan.session.amount,
        status: 'completed',
        expiresAt: plan.session.expiresAt,
        createdAt: plan.session.createdAt,
      }),
    );
    if (plan.payment) {
      await manager.insert(Payment, {
        paymentSessionId: session.id,
        bookingRequestId: bookingRequest.id,
        amount: plan.payment.amount,
        paidAt: plan.payment.paidAt,
        createdAt: plan.payment.createdAt,
      });
    }
  }
}

function summarize(generated: GeneratedBookingRequest[]): string {
  const counts = {
    approved: 0,
    rejected: 0,
    cancelled: 0,
    expired: 0,
    pending: 0,
  };
  let paid = 0;
  for (const plan of generated) {
    counts[plan.status] += 1;
    if (plan.payment) paid += 1;
  }
  return (
    `approved ${counts.approved} (paid ${paid}), rejected ${counts.rejected}, ` +
    `cancelled ${counts.cancelled}, expired ${counts.expired}, pending ${counts.pending}`
  );
}
