export interface XlsxColumnLayout {
  // In characters.
  width: number;
  // One of `XLSX_FORMATS`; leave out for text.
  numFmt?: string;
}

// Entry order is column order.
export type XlsxLayout<Row> = Record<keyof Row & string, XlsxColumnLayout>;

export interface XlsxSheet<Row> {
  name: string;
  layout: XlsxLayout<Row>;
  header: (key: keyof Row & string) => string;
  rows: Row[];
}

export interface XlsxFile {
  content: Buffer;
  filename: string;
}
