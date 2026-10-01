import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Repository } from 'typeorm';

import { HOTEL_TIME_ZONE } from '../booking-requests/booking-request.constants.js';
import { MailService } from '../mail/mail.service.js';
import { User } from '../users/entities/user.entity.js';
import {
  MONTHLY_REVENUE_REPORT_CRON,
  REPORTED_MONTH_FORMAT,
} from './monthly-revenue-report.constants.js';
import { RevenueStatisticsService } from './revenue-statistics.service.js';

// Mails every active admin the revenue of the month that just ended, split by
// room type — including a month that took nothing, so silence never has to be
// read as "the mail did not come". A run missed while the app is down is not
// caught up, and every running instance sends its own copy.
@Injectable()
export class MonthlyRevenueReportService {
  private readonly logger = new Logger(MonthlyRevenueReportService.name);

  constructor(
    private readonly revenueStatisticsService: RevenueStatisticsService,
    private readonly mailService: MailService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  @Cron(MONTHLY_REVENUE_REPORT_CRON, { timeZone: HOTEL_TIME_ZONE })
  async sendForLastMonth(): Promise<void> {
    // In hotel time before stepping back: at 00:05 on the 1st, UTC is still
    // in the previous month.
    const lastMonth = DateTime.now()
      .setZone(HOTEL_TIME_ZONE)
      .minus({ months: 1 });
    try {
      const queued = await this.sendForMonth(lastMonth);
      this.logger.log(
        `Queued the ${lastMonth.toFormat(REPORTED_MONTH_FORMAT)} revenue report for ${queued} admin(s)`,
      );
    } catch (error) {
      this.logger.error('Monthly revenue report failed', error);
    }
  }

  // `dayInMonth` is any moment inside the month to report; the month is read
  // in hotel time whatever zone it comes in. Returns how many admins the
  // report was queued for.
  async sendForMonth(dayInMonth: DateTime): Promise<number> {
    const month = dayInMonth.setZone(HOTEL_TIME_ZONE).startOf('month');
    const report = await this.revenueStatisticsService.report({
      from: month.toISODate()!,
      to: month.endOf('month').toISODate()!,
      groupBy: 'roomType',
    });
    const admins = await this.usersRepository.find({
      select: { email: true, fullName: true },
      where: { role: 'admin', status: 'active' },
    });

    for (const admin of admins) {
      await this.mailService.enqueueMonthlyRevenueReportEmail(
        admin,
        month,
        report,
      );
    }
    return admins.length;
  }
}
