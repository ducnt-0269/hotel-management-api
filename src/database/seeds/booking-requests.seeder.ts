import { faker } from '@faker-js/faker';
import { DateTime } from 'luxon';

import { BookingRequestApproval } from '../../booking-requests/approval/entities/booking-request-approval.entity.js';
import {
  holdExpiry,
  stayNightDates,
} from '../../booking-requests/booking-request-dates.js';
import {
  HOLD_HOURS,
  HOTEL_TIME_ZONE,
  MAX_ROOMS_PER_REQUEST,
} from '../../booking-requests/booking-request.constants.js';
import { BookingRequestCancellation } from '../../booking-requests/cancellation/entities/booking-request-cancellation.entity.js';
import { BookingRequest } from '../../booking-requests/entities/booking-request.entity.js';
import { BookingRequestExpiration } from '../../booking-requests/expiration/entities/booking-request-expiration.entity.js';
import { BookingRequestRejection } from '../../booking-requests/rejection/entities/booking-request-rejection.entity.js';
import { PaymentSession } from '../../payment-sessions/entities/payment-session.entity.js';
import { Payment } from '../../payment-sessions/payment/entities/payment.entity.js';
import { RoomType } from '../../room-types/entities/room-type.entity.js';
import { User } from '../../users/entities/user.entity.js';

import type { BookingRequestStatus } from '../../booking-requests/entities/booking-request.entity.js';
import type { DurationLike } from 'luxon';
import type { DataSource, EntityManager } from 'typeorm';

// Reproducible demo data: the same shape every run, dated relative to the
// run, so runs on different days keep the shape but not the dates.
const FAKER_SEED = 20260929;

// A year of history, the current month included. Each month's first request
// is always paid, so every month has revenue.
const MONTHS_BACK = 12;
const REQUESTS_PER_MONTH = 7;

// How a past request ended.
const OUTCOME_WEIGHTS = [
  { value: 'paid', weight: 0.55 },
  { value: 'unpaid', weight: 0.1 },
  { value: 'rejected', weight: 0.15 },
  { value: 'cancelled', weight: 0.1 },
  { value: 'expired', weight: 0.1 },
] as const;

// Holds still open, raised at seed time so the expiry cron does not close
// them at once; check-in falls within this many days.
const PENDING_HOLD_COUNT = 4;
const PENDING_CHECK_IN_WITHIN_DAYS = 60;

// Offsets from the moment the guest raised the request: the admin decides
// (or the guest cancels) while the hold is open, and the guest pays through
// Stripe Checkout right after approval.
const DECIDED_AFTER: DurationLike = { hours: 2 };
const CHECKOUT_OPENED_AFTER: DurationLike = { hours: 3 };
const PAID_AFTER: DurationLike = { hours: 3, minutes: 10 };
// The expiry cron runs every 30 minutes, so a lapse is recorded a bit late.
const EXPIRY_RECORDED_AFTER: DurationLike = { hours: HOLD_HOURS, minutes: 5 };
// Stripe Checkout's default session lifetime.
const CHECKOUT_SESSION_TTL: DurationLike = { hours: 24 };

// Check-in lands this many days after the request: past the 24h hold, so
// every step above happens before the stay starts.
const LEAD_DAYS_MIN = 2;
const LEAD_DAYS_MAX = 14;
const NIGHTS_MIN = 1;
const NIGHTS_MAX = 7;

// Random room type/date picks a room-holding request may try before it is
// dropped for lack of capacity.
const MAX_PLACEMENT_ATTEMPTS = 20;

const REJECTION_REASONS = [
  'Hotel fully booked for a private event on these dates',
  'Guest could not be reached to confirm identity documents',
  'Duplicate request already approved for the same stay',
  'Room type taken out of service for renovation',
] as const;

// Fake Checkout ids: Stripe is never called for seeded payments.
const STRIPE_SESSION_ID_PREFIX = 'cs_seed_';

type Outcome = (typeof OUTCOME_WEIGHTS)[number]['value'] | 'pending';

const STATUS_BY_OUTCOME: Record<Outcome, BookingRequestStatus> = {
  paid: 'approved',
  unpaid: 'approved',
  rejected: 'rejected',
  cancelled: 'cancelled',
  expired: 'expired',
  pending: 'pending',
};

// The last event each outcome writes, so a request is only created early
// enough for all of it to have happened by now.
const LAST_EVENT_AFTER: Record<Outcome, DurationLike> = {
  paid: PAID_AFTER,
  unpaid: DECIDED_AFTER,
  rejected: DECIDED_AFTER,
  cancelled: DECIDED_AFTER,
  expired: EXPIRY_RECORDED_AFTER,
  pending: {},
};

type SeedRoomType = Pick<RoomType, 'id' | 'pricePerNight' | 'totalRooms'>;

interface Stay {
  roomTypeId: string;
  roomsRequested: number;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
}

// Rooms already held per `roomTypeId|night`, so no night ever holds more
// rooms than the room type has — the same rule `POST /booking-requests`
// enforces, counted over approved and pending requests only.
type Occupancy = Map<string, number>;

interface Seeding {
  manager: EntityManager;
  guestIds: string[];
  adminId: string;
  roomTypes: SeedRoomType[];
  occupancy: Occupancy;
  seeded: Record<Outcome, number>;
}

// Guarded on the whole table: it runs once against an empty database, in a
// single transaction, so a failed run leaves nothing behind to skip over.
export async function seedBookingRequests(
  dataSource: DataSource,
): Promise<void> {
  if (await dataSource.getRepository(BookingRequest).exists()) {
    console.log('booking requests: skipped (already seeded)');
    return;
  }

  const users = dataSource.getRepository(User);
  const guests = await users.find({
    select: { id: true },
    where: { role: 'user', status: 'active' },
    order: { id: 'ASC' },
  });
  const admin = await users.findOne({
    select: { id: true },
    where: { role: 'admin' },
  });
  const roomTypes = await dataSource.getRepository(RoomType).find({
    select: { id: true, pricePerNight: true, totalRooms: true },
    order: { id: 'ASC' },
  });
  if (guests.length === 0 || !admin || roomTypes.length === 0) {
    throw new Error(
      'booking-requests seeder needs the users and room-types seeders to run first',
    );
  }

  faker.seed(FAKER_SEED);
  const now = DateTime.now().setZone(HOTEL_TIME_ZONE);
  const seeded: Record<Outcome, number> = {
    paid: 0,
    unpaid: 0,
    rejected: 0,
    cancelled: 0,
    expired: 0,
    pending: 0,
  };
  let monthsWithRevenue = 0;

  await dataSource.transaction(async (manager) => {
    const seeding: Seeding = {
      manager,
      guestIds: guests.map((guest) => guest.id),
      adminId: admin.id,
      roomTypes,
      occupancy: new Map(),
      seeded,
    };

    // Oldest month first, so ids follow the timeline.
    for (let monthsAgo = MONTHS_BACK - 1; monthsAgo >= 0; monthsAgo--) {
      const monthStart = now.startOf('month').minus({ months: monthsAgo });
      const monthEnd = DateTime.min(monthStart.plus({ months: 1 }), now)!;
      const paidBefore = seeded.paid;

      for (let i = 0; i < REQUESTS_PER_MONTH; i++) {
        const outcome: Outcome =
          i === 0
            ? 'paid'
            : faker.helpers.weightedArrayElement(OUTCOME_WEIGHTS);
        // Every event of the request stays inside its month.
        const latest = monthEnd.minus(LAST_EVENT_AFTER[outcome]);
        if (latest <= monthStart) continue;
        const createdAt = DateTime.fromJSDate(
          faker.date.between({
            from: monthStart.toJSDate(),
            to: latest.toJSDate(),
          }),
        ).setZone(HOTEL_TIME_ZONE);
        const earliestCheckIn = createdAt
          .startOf('day')
          .plus({ days: LEAD_DAYS_MIN });
        await seedRequest(
          seeding,
          outcome,
          createdAt,
          earliestCheckIn,
          LEAD_DAYS_MAX - LEAD_DAYS_MIN,
        );
      }
      if (seeded.paid > paidBefore) monthsWithRevenue += 1;
    }

    for (let i = 0; i < PENDING_HOLD_COUNT; i++) {
      await seedRequest(
        seeding,
        'pending',
        now,
        now.startOf('day').plus({ days: 1 }),
        PENDING_CHECK_IN_WITHIN_DAYS - 1,
      );
    }
  });

  const total = Object.values(seeded).reduce((sum, n) => sum + n, 0);
  console.log(
    `booking requests: ${total} seeded — paid ${seeded.paid}, ` +
      `approved unpaid ${seeded.unpaid}, rejected ${seeded.rejected}, ` +
      `cancelled ${seeded.cancelled}, expired ${seeded.expired}, ` +
      `pending ${seeded.pending}; revenue in ${monthsWithRevenue}/${MONTHS_BACK} months`,
  );
  if (monthsWithRevenue < MONTHS_BACK) {
    console.warn(
      'booking requests: some months have no payment — the current month ' +
        'is empty when seeded within a few hours of its start',
    );
  }
}

async function seedRequest(
  seeding: Seeding,
  outcome: Outcome,
  createdAt: DateTime,
  earliestCheckIn: DateTime,
  checkInSpreadDays: number,
): Promise<void> {
  const status = STATUS_BY_OUTCOME[outcome];
  const holdsRooms = status === 'approved' || status === 'pending';
  const stay = placeStay(
    seeding,
    holdsRooms,
    earliestCheckIn,
    checkInSpreadDays,
  );
  if (!stay) return;
  await insertRequest(
    seeding,
    outcome,
    faker.helpers.arrayElement(seeding.guestIds),
    stay,
    createdAt,
  );
  seeding.seeded[outcome] += 1;
}

// Picks a room type, stay and room count; for a request that holds rooms,
// retries until every night fits the room type's remaining capacity.
function placeStay(
  { roomTypes, occupancy }: Seeding,
  holdsRooms: boolean,
  earliestCheckIn: DateTime,
  checkInSpreadDays: number,
): Stay | null {
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    const roomType = faker.helpers.arrayElement(roomTypes);
    const nights = faker.number.int({ min: NIGHTS_MIN, max: NIGHTS_MAX });
    const roomsRequested = faker.number.int({
      min: 1,
      max: Math.min(MAX_ROOMS_PER_REQUEST, roomType.totalRooms),
    });
    const checkIn = earliestCheckIn.plus({
      days: faker.number.int({ min: 0, max: checkInSpreadDays }),
    });
    const checkInDate = checkIn.toISODate()!;
    const checkOutDate = checkIn.plus({ days: nights }).toISODate()!;

    if (holdsRooms) {
      const keys = stayNightDates(checkInDate, checkOutDate).map(
        (night) => `${roomType.id}|${night}`,
      );
      const fits = keys.every(
        (key) =>
          (occupancy.get(key) ?? 0) + roomsRequested <= roomType.totalRooms,
      );
      if (!fits) continue;
      for (const key of keys) {
        occupancy.set(key, (occupancy.get(key) ?? 0) + roomsRequested);
      }
    }

    const totalAmount =
      BigInt(roomType.pricePerNight) * BigInt(nights) * BigInt(roomsRequested);
    return {
      roomTypeId: roomType.id,
      roomsRequested,
      checkInDate,
      checkOutDate,
      totalAmount: String(totalAmount),
    };
  }
  return null;
}

// Writes the request with its final status plus exactly the outcome rows
// that status is a projection of.
async function insertRequest(
  { manager, adminId }: Seeding,
  outcome: Outcome,
  userId: string,
  stay: Stay,
  createdAt: DateTime,
): Promise<void> {
  const at = (offset: DurationLike): Date => createdAt.plus(offset).toJSDate();
  // A payment does not change the request's status: approval was its last
  // status change.
  const statusChangedAt =
    outcome === 'paid' ? at(DECIDED_AFTER) : at(LAST_EVENT_AFTER[outcome]);

  const request = await manager.save(
    manager.create(BookingRequest, {
      ...stay,
      userId,
      status: STATUS_BY_OUTCOME[outcome],
      expiresAt: holdExpiry(createdAt.toJSDate(), stay.checkInDate),
      createdAt: createdAt.toJSDate(),
      updatedAt: statusChangedAt,
    }),
  );
  const bookingRequestId = request.id;

  switch (outcome) {
    case 'paid':
    case 'unpaid':
      await manager.insert(BookingRequestApproval, {
        bookingRequestId,
        adminUserId: adminId,
        createdAt: at(DECIDED_AFTER),
      });
      if (outcome === 'paid') {
        await insertPayment(manager, request, at);
      }
      return;
    case 'rejected':
      await manager.insert(BookingRequestRejection, {
        bookingRequestId,
        adminUserId: adminId,
        reason: faker.helpers.arrayElement(REJECTION_REASONS),
        createdAt: at(DECIDED_AFTER),
      });
      return;
    case 'cancelled':
      await manager.insert(BookingRequestCancellation, {
        bookingRequestId,
        createdAt: at(DECIDED_AFTER),
      });
      return;
    case 'expired':
      await manager.insert(BookingRequestExpiration, {
        bookingRequestId,
        createdAt: at(EXPIRY_RECORDED_AFTER),
      });
      return;
    case 'pending':
      return;
  }
}

// A completed Checkout session and the payment its webhook recorded.
async function insertPayment(
  manager: EntityManager,
  request: BookingRequest,
  at: (offset: DurationLike) => Date,
): Promise<void> {
  const stripeSessionId = `${STRIPE_SESSION_ID_PREFIX}${request.id.padStart(4, '0')}`;
  const openedAt = DateTime.fromJSDate(at(CHECKOUT_OPENED_AFTER));
  const session = await manager.save(
    manager.create(PaymentSession, {
      bookingRequestId: request.id,
      stripeSessionId,
      url: `https://checkout.stripe.com/c/pay/${stripeSessionId}`,
      amount: request.totalAmount,
      status: 'completed',
      expiresAt: openedAt.plus(CHECKOUT_SESSION_TTL).toJSDate(),
      createdAt: openedAt.toJSDate(),
    }),
  );
  const paidAt = at(PAID_AFTER);
  await manager.insert(Payment, {
    paymentSessionId: session.id,
    bookingRequestId: request.id,
    amount: request.totalAmount,
    paidAt,
    createdAt: paidAt,
  });
}
