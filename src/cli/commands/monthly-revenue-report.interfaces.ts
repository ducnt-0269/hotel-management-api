import type { DateTime } from 'luxon';

// Options of `revenue:monthly-report`, after nest-commander has parsed them.
export interface MonthlyRevenueReportOptions {
  month: DateTime;
}
