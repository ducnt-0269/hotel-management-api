export const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const XLSX_FORMATS = {
  // Thousands separators; the cell stays a number.
  vnd: '#,##0',
  dateTime: 'yyyy-mm-dd hh:mm',
} as const;
