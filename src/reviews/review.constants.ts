// Bounds on a review's own content.
export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const COMMENT_MAX_LENGTH = 1000;

// Every state a review can be in; the DB CHECK lists the same values.
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
