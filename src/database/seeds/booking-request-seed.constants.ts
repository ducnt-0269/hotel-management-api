// Reproducible demo data: the same shape every run, but generated relative
// to the run day, so two runs on different days do not produce the same
// absolute dates.
export const FAKER_SEED = 20260929;

// Past stays spread over this many calendar months, the current one
// included (index 0 in the generator).
export const PAST_WINDOW_MONTHS = 12;

// Upcoming stays reach this many days into the future.
export const UPCOMING_WINDOW_DAYS = 60;

// Roughly how many requests to generate; a handful may be dropped if a
// capacity retry never finds a free night for that room type (rare, given
// the spread across a year).
export const PAST_REQUEST_COUNT = 80;
export const UPCOMING_PENDING_COUNT = 4;
export const UPCOMING_APPROVED_COUNT = 3;

// A stay length that reads as a real hotel visit rather than the policy max.
export const NIGHTS_MIN = 1;
export const NIGHTS_MAX = 7;

// How long before check-in a guest raises the request, in hours. Kept
// >= 48h so there is always a full day between the hold expiring and
// check-in for the payment step (t2, t3) to fit inside.
export const LEAD_HOURS_MIN = 48;
export const LEAD_HOURS_MAX = 336; // 14 days

// How soon after approval a guest opens the Stripe Checkout session.
export const PAYMENT_START_DELAY_HOURS_MAX = 6;

// The expiration sweep runs every 30 minutes (see
// BookingRequestExpirationService); an expired hold's outcome lands
// somewhere in the next sweep after it lapsed, not at the exact instant.
export const EXPIRATION_SWEEP_MINUTES_MAX = 30;

// How many candidate room type/date combinations a capacity-holding request
// may try before this generation attempt is dropped.
export const MAX_PLACEMENT_ATTEMPTS = 20;

// Past-stay status mix (weights sum to 1): most requests get approved and
// paid, a smaller share approved but never paid, the rest split across the
// ways a request can end without a stay.
export const PAST_STATUS_WEIGHTS = [
  { value: 'approved-paid', weight: 0.55 },
  { value: 'approved-unpaid', weight: 0.1 },
  { value: 'rejected', weight: 0.15 },
  { value: 'cancelled', weight: 0.1 },
  { value: 'expired', weight: 0.1 },
] as const;

export const REJECTION_REASONS = [
  'Hotel fully booked for a private event on these dates',
  'Guest could not be reached to confirm identity documents',
  'Duplicate request already approved for the same stay',
  'Room type taken out of service for renovation',
] as const;

export const STRIPE_SESSION_ID_PREFIX = 'cs_seed_';
