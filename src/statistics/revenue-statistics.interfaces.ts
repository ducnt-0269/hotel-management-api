// Raw rows as Postgres returns them: SUM and COUNT come back as strings.
export interface RawRevenueTotals {
  revenue: string;
  payments: string;
}

export interface RawMonthRevenue extends RawRevenueTotals {
  month: string;
}

export interface RawRoomTypeRevenue extends RawRevenueTotals {
  roomTypeId: string;
  roomTypeName: string;
}
