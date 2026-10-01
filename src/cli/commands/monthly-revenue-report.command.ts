import { DateTime } from 'luxon';
import { Command, CommandRunner, Option } from 'nest-commander';

import { HOTEL_TIME_ZONE } from '../../booking-requests/booking-request.constants.js';
import { REPORTED_MONTH_FORMAT } from '../../statistics/monthly-revenue-report.constants.js';
import { MonthlyRevenueReportService } from '../../statistics/monthly-revenue-report.service.js';

import type { MonthlyRevenueReportOptions } from './monthly-revenue-report.interfaces.js';

// `npm run cli -- revenue:monthly-report --month 2026-09` queues the same mail
// the cron sends on the 1st, for any month. The month is required: a re-run is
// a deliberate act, and running it twice mails every admin twice.
@Command({
  name: 'revenue:monthly-report',
  description: "Mail every active admin one month's revenue by room type",
})
export class MonthlyRevenueReportCommand extends CommandRunner {
  constructor(
    private readonly monthlyRevenueReportService: MonthlyRevenueReportService,
  ) {
    super();
  }

  async run(
    _passedParams: string[],
    { month }: MonthlyRevenueReportOptions,
  ): Promise<void> {
    const queued = await this.monthlyRevenueReportService.sendForMonth(month);
    console.log(
      `Queued the ${month.toFormat(REPORTED_MONTH_FORMAT)} revenue report for ${queued} admin(s)`,
    );
  }

  @Option({
    flags: '-m, --month <month>',
    description: `Month to report, as ${REPORTED_MONTH_FORMAT} in hotel time`,
    required: true,
  })
  parseMonth(value: string): DateTime {
    const month = DateTime.fromFormat(value, REPORTED_MONTH_FORMAT, {
      zone: HOTEL_TIME_ZONE,
    });
    if (!month.isValid) {
      // commander's own usage error: one line on stderr and exit code 1, the
      // same as a missing option, instead of a stack trace.
      this.command.error(
        `error: --month must be ${REPORTED_MONTH_FORMAT}, e.g. 2026-09; got "${value}"`,
      );
    }
    return month;
  }
}
