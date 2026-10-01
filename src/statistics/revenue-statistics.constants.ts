// The ways revenue can be split: by calendar month or by room type.
export const REVENUE_GROUP_BYS = ['month', 'roomType'] as const;

// The longest range one report may cover, `from` and `to` both included.
export const MAX_RANGE_YEARS = 2;

// Every amount is integer VND, the only currency the hotel takes.
export const REVENUE_CURRENCY = 'VND';

// Postgres `to_char` pattern for a month key, e.g. `2026-01`.
export const MONTH_KEY_FORMAT = 'YYYY-MM';

// The same month key as a pattern, for the response contract.
export const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;
