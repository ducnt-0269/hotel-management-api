import { StreamableFile } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { DateTime } from 'luxon';

import { XLSX_CONTENT_TYPE } from './xlsx.constants.js';

import type {
  XlsxColumnLayout,
  XlsxFile,
  XlsxLayout,
  XlsxSheet,
} from './xlsx.interfaces.js';

// Builds the workbook in memory, so callers cap the rows.
export async function buildXlsx<Row extends object>(
  sheets: XlsxSheet<Row>[],
  timeZone: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const { name, layout, header, rows } of sheets) {
    const sheet = workbook.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.columns = toSheetColumns(layout, header);
    sheet.getRow(1).font = { bold: true };
    sheet.addRows(rows.map((row) => onWallClock(row, timeZone)));
  }

  // Shared strings only pay off when many cells repeat the same text.
  return Buffer.from(
    await workbook.xlsx.writeBuffer({ useSharedStrings: false }),
  );
}

export function xlsxDownload({ content, filename }: XlsxFile): StreamableFile {
  return new StreamableFile(content, {
    type: XLSX_CONTENT_TYPE,
    disposition: `attachment; filename="${filename}"`,
  });
}

function toSheetColumns<Row>(
  layout: XlsxLayout<Row>,
  header: (key: keyof Row & string) => string,
) {
  // `Object.entries` forgets the key type of a generic record.
  const entries = Object.entries(layout) as [
    keyof Row & string,
    XlsxColumnLayout,
  ][];
  return entries.map(([key, { width, numFmt }]) => ({
    key,
    header: header(key),
    width,
    style: numFmt ? { numFmt } : {},
  }));
}

// xlsx dates have no zone: shift each one to `timeZone`'s wall-clock time.
function onWallClock(row: object, timeZone: string): object {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Date
        ? DateTime.fromJSDate(value)
            .setZone(timeZone)
            .setZone('UTC', { keepLocalTime: true })
            .toJSDate()
        : value,
    ]),
  );
}
