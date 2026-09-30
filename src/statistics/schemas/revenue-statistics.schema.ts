import { z } from 'zod';

import { idSchema } from '../../booking-requests/schemas/booking-request.schema.js';
import {
  MONTH_KEY_PATTERN,
  REVENUE_CURRENCY,
  REVENUE_GROUP_BYS,
} from '../revenue-statistics.constants.js';

export const revenueGroupBySchema = z.enum(REVENUE_GROUP_BYS);

// Both ends are whole days in hotel time, inclusive. YYYY-MM-DD strings
// compare correctly as plain strings.
export const revenueStatisticsQuerySchema = z
  .object({
    from: z.iso.date().describe('First day counted, in hotel time'),
    to: z.iso.date().describe('Last day counted, in hotel time'),
    groupBy: revenueGroupBySchema,
    // An unknown id matches nothing: an empty report, not 404.
    roomTypeId: idSchema.optional(),
  })
  .refine(({ from, to }) => from <= to, {
    path: ['to'],
    message: 'Must be on or after from',
  });

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
