// 00:05 on the 1st, hotel time: the month being reported has fully ended, so
// a payment taken in its last minute is still counted.
export const MONTHLY_REVENUE_REPORT_CRON = '5 0 1 * *';

// The reported month as the log names it, e.g. `2026-09`.
export const REPORTED_MONTH_LOG_FORMAT = 'yyyy-MM';
