// Reproducible demo data: the same shape every run, but generated relative
// to when it runs, so two runs on different days do not produce the same
// absolute review dates. Deliberately different from the booking-requests
// seed so the two draws never step on each other's sequence.
export const FAKER_SEED = 20260930;

// Share of paid, ended stays that end up with a review at all.
export const REVIEW_SHARE = 0.6;

// Review moderation mix once a review exists: most demo reviews are already
// moderated so admin lists show history, a few stay pending to exercise the
// moderation queue.
export const REVIEW_STATUS_WEIGHTS = [
  { value: 'approved', weight: 0.7 },
  { value: 'rejected', weight: 0.15 },
  { value: 'pending', weight: 0.15 },
] as const;

// Guest ratings skew positive, as real hotel reviews tend to.
export const RATING_WEIGHTS = [
  { value: 3, weight: 0.1 },
  { value: 4, weight: 0.35 },
  { value: 5, weight: 0.55 },
] as const;

export const REVIEW_COMMENTS = [
  'Clean room, friendly staff — would book again.',
  'Great location and breakfast, though the room was a bit noisy at night.',
  'Comfortable bed and the view matched the photos on the website.',
  'Fast check-in, good value for the price.',
  'Spacious and quiet, exactly what we needed for a short trip.',
] as const;

export const REVIEW_REJECTION_REASONS = [
  'Comment contains unrelated promotional content',
  'Content violates the review guidelines',
  'Unable to verify the guest actually stayed at the hotel',
] as const;
