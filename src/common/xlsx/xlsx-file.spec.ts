import ExcelJS from 'exceljs';

import { buildXlsx, xlsxDownload } from './xlsx-file.js';
import { XLSX_CONTENT_TYPE, XLSX_FORMATS } from './xlsx.constants.js';

import type { XlsxLayout } from './xlsx.interfaces.js';

interface Row {
  name: string;
  price: number;
  changedAt: Date;
}

const layout: XlsxLayout<Row> = {
  name: { width: 20 },
  price: { width: 12, numFmt: XLSX_FORMATS.vnd },
  changedAt: { width: 18, numFmt: XLSX_FORMATS.dateTime },
};
const header = (key: keyof Row) => key.toUpperCase();

async function read(content: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(content as never);
  return workbook;
}

describe('buildXlsx', () => {
  const row: Row = {
    name: 'Deluxe',
    price: 1_500_000,
    // 00:30 on 29 September in Asia/Ho_Chi_Minh (UTC+7).
    changedAt: new Date('2026-09-28T17:30:00Z'),
  };

  it('writes each sheet with its columns in layout order, a bold header row and the rows under it', async () => {
    const workbook = await read(
      await buildXlsx(
        [
          { name: 'First', layout, header, rows: [row] },
          { name: 'Second', layout, header, rows: [] },
        ],
        'Asia/Ho_Chi_Minh',
      ),
    );
    const first = workbook.getWorksheet('First')!;

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'First',
      'Second',
    ]);
    expect(first.getRow(1).values).toEqual([
      undefined,
      'NAME',
      'PRICE',
      'CHANGEDAT',
    ]);
    expect(first.getRow(1).font?.bold).toBe(true);
    expect(first.getRow(2).getCell(2).value).toBe(1_500_000);
    expect(first.getRow(2).getCell(2).numFmt).toBe(XLSX_FORMATS.vnd);
    expect(workbook.getWorksheet('Second')!.rowCount).toBe(1);
  });

  it('writes dates as the wall-clock time of the given zone', async () => {
    const workbook = await read(
      await buildXlsx(
        [{ name: 'S', layout, header, rows: [row] }],
        'Asia/Ho_Chi_Minh',
      ),
    );
    const cell = workbook.getWorksheet('S')!.getRow(2).getCell(3);

    // xlsx has no zone: the cell reads 2026-09-29 00:30 as it is stored.
    expect(cell.value).toEqual(new Date('2026-09-29T00:30:00Z'));
  });
});

describe('xlsxDownload', () => {
  it('sends the content as an xlsx download with the given file name', () => {
    const file = xlsxDownload({
      content: Buffer.from('x'),
      filename: 'report.xlsx',
    });

    expect(file.getHeaders()).toMatchObject({
      type: XLSX_CONTENT_TYPE,
      disposition: 'attachment; filename="report.xlsx"',
      length: 1,
    });
  });
});
