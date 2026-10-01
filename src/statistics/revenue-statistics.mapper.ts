import { REVENUE_CURRENCY } from './revenue-statistics.constants.js';

import type {
  RawMonthRevenue,
  RawRoomTypeRevenue,
} from './revenue-statistics.interfaces.js';
import type {
  RevenueStatisticsQuery,
  RevenueStatisticsResponse,
  RevenueStatisticsRow,
} from './schemas/revenue-statistics.schema.js';

export function toMonthRevenueRow(raw: RawMonthRevenue): RevenueStatisticsRow {
  return {
    key: raw.month,
    revenue: Number(raw.revenue),
    payments: Number(raw.payments),
  };
}

export function toRoomTypeRevenueRow(
  raw: RawRoomTypeRevenue,
): RevenueStatisticsRow {
  return {
    key: { id: Number(raw.roomTypeId), name: raw.roomTypeName },
    revenue: Number(raw.revenue),
    payments: Number(raw.payments),
  };
}

// The total is the sum of the rows, so the report never disagrees with itself.
export function toRevenueStatisticsResponse(
  { groupBy, from, to }: RevenueStatisticsQuery,
  data: RevenueStatisticsRow[],
): RevenueStatisticsResponse {
  return {
    groupBy,
    from,
    to,
    currency: REVENUE_CURRENCY,
    totalRevenue: data.reduce((sum, row) => sum + row.revenue, 0),
    data,
  };
}
