import { DateTime } from 'luxon';
import { z } from 'zod';

import { idSchema } from '../../booking-requests/schemas/booking-request.schema.js';
import {
  MAX_RANGE_YEARS,
  MONTH_KEY_PATTERN,
  REVENUE_CURRENCY,
  REVENUE_GROUP_BYS,
} from '../revenue-statistics.constants.js';

export const revenueGroupBySchema = z.enum(REVENUE_GROUP_BYS);

// Both ends are whole days, inclusive, so the range ends at the latest the
// day before the same date MAX_RANGE_YEARS later. YYYY-MM-DD strings compare
// correctly as plain strings.
function refineRange(
  { from, to }: { from: string; to: string },
  ctx: z.RefinementCtx,
): void {
  if (from > to) {
    ctx.addIssue({
      code: 'custom',
      path: ['to'],
      message: 'Must be on or after from',
    });
    return;
  }

  const lastDay = DateTime.fromISO(from)
    .plus({ years: MAX_RANGE_YEARS })
    .minus({ days: 1 })
    .toISODate();
  if (lastDay !== null && to > lastDay) {
    ctx.addIssue({
      code: 'custom',
      path: ['to'],
      message: `Range cannot exceed ${MAX_RANGE_YEARS} years`,
    });
  }
}

// Both ends are whole days in hotel time.
export const revenueStatisticsQuerySchema = z
  .object({
    from: z.iso.date().describe('First day counted, in hotel time'),
    to: z.iso
      .date()
      .describe(
        `Last day counted, in hotel time; at most ${MAX_RANGE_YEARS} years after from`,
      ),
    groupBy: revenueGroupBySchema,
    // An unknown id matches nothing: an empty report, not 404.
    roomTypeId: idSchema.optional(),
  })
  .superRefine(refineRange);

const monthKeySchema = z
  .string()
  .regex(MONTH_KEY_PATTERN)
  .describe('Month as YYYY-MM, when grouped by month');

const roomTypeKeySchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const revenueStatisticsRowSchema = z.object({
  key: z.union([monthKeySchema, roomTypeKeySchema]),
  revenue: z.number().int(),
  payments: z.number().int(),
});

export const revenueStatisticsResponseSchema = z.object({
  groupBy: revenueGroupBySchema,
  from: z.iso.date(),
  to: z.iso.date(),
  currency: z.literal(REVENUE_CURRENCY),
  totalRevenue: z.number().int(),
  data: z.array(revenueStatisticsRowSchema),
});

export type RevenueStatisticsQuery = z.infer<
  typeof revenueStatisticsQuerySchema
>;

export type RevenueStatisticsRow = z.infer<typeof revenueStatisticsRowSchema>;

export type RevenueStatisticsResponse = z.infer<
  typeof revenueStatisticsResponseSchema
>;
