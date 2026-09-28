// Numbers stay numbers so the sheet can sort and sum them.
export interface RoomTypeExportRow {
  id: number;
  name: string;
  description: string;
  pricePerNight: number;
  totalRooms: number;
  amenities: string;
  updatedAt: Date;
}
