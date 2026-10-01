// Raw rows as Postgres returns them: SUM and COUNT come back as strings.
export interface RawMonthRevenue {
  month: string;
  revenue: string;
  payments: string;
}

export interface RawRoomTypeRevenue {
  roomTypeId: string;
  roomTypeName: string;
  revenue: string;
  payments: string;
}
