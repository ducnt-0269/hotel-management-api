import { MONTH_LABEL_FORMAT } from './monthly-revenue-report-email.constants.js';
import { formatVnd } from './vnd-amount.js';

import type { RevenueStatisticsResponse } from '../../statistics/schemas/revenue-statistics.schema.js';
import type { User } from '../../users/entities/user.entity.js';
import type { ISendMailOptions } from '@nestjs-modules/mailer';
import type { DateTime } from 'luxon';
import type { I18nService } from 'nestjs-i18n';

// A month's revenue, grouped by room type, for one admin. Subject and plain
// text are built here; the HTML is rendered from
// `templates/monthly-revenue-report.mjml` in the queue worker.
export function monthlyRevenueReportEmail(
  i18n: I18nService,
  lang: string,
  admin: Pick<User, 'fullName'>,
  month: DateTime,
  report: RevenueStatisticsResponse,
): ISendMailOptions {
  const details = {
    fullName: admin.fullName,
    month: month.toFormat(MONTH_LABEL_FORMAT),
    total: formatVnd(lang, report.totalRevenue),
    totalPayments: report.data.reduce((sum, row) => sum + row.payments, 0),
  };
  const rows = report.data.map((row) => ({
    // The report is grouped by room type, so the key is always an object; the
    // string branch only satisfies the type, whose key can also be a month.
    name: typeof row.key === 'string' ? row.key : row.key.name,
    revenue: formatVnd(lang, row.revenue),
    payments: row.payments,
  }));
  const t = (key: string, extra: object = {}): string =>
    i18n.t(`mail.monthlyRevenueReport.${key}`, {
      lang,
      args: { ...details, ...extra },
    });
  const subject = t('subject');

  return {
    subject,
    template: 'monthly-revenue-report.mjml',
    context: {
      i18nLang: lang,
      subject,
      preview: t('preview'),
      footer: t('footer'),
      ...details,
      rows,
      hasRows: rows.length > 0,
    },
    text: [
      t('greeting'),
      '',
      t('body'),
      '',
      `${t('summary.total')}: ${details.total}`,
      `${t('summary.payments')}: ${details.totalPayments}`,
      '',
      ...(rows.length > 0
        ? rows.map(
            (row) =>
              `${row.name}: ${row.revenue} (${t('paymentCount', { count: row.payments })})`,
          )
        : [t('empty')]),
    ].join('\n'),
  };
}
