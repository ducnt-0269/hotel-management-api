import { XLSX_FORMATS } from '../common/xlsx/xlsx.constants.js';

import type { XlsxLayout } from '../common/xlsx/xlsx.interfaces.js';
import type { RoomTypeExportRow } from './room-type-export.interfaces.js';

// Bounds RAM, since the file is built in memory: about 80-110 MB per export at
// 5 000 rows. A hotel sells tens of room types.
export const ROOM_TYPE_EXPORT_MAX_ROWS = 5_000;

// Rows per query, as the hold expiry sweep reads them.
export const ROOM_TYPE_EXPORT_BATCH_SIZE = 100;

// Key order is column order; the `Record` type rejects a row field left out.
export const ROOM_TYPE_EXPORT_LAYOUT: XlsxLayout<RoomTypeExportRow> = {
  id: { width: 8 },
  name: { width: 30 },
  description: { width: 50 },
  pricePerNight: { width: 20, numFmt: XLSX_FORMATS.vnd },
  totalRooms: { width: 14 },
  amenities: { width: 30 },
  updatedAt: { width: 18, numFmt: XLSX_FORMATS.dateTime },
};
