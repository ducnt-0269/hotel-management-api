import ExcelJS from 'exceljs';
import { DateTime } from 'luxon';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { HOTEL_TIME_ZONE } from '../../src/booking-requests/booking-request.constants.js';
import { XLSX_CONTENT_TYPE } from '../../src/common/xlsx/xlsx.constants.js';
import { RoomTypeAmenity } from '../../src/room-types/entities/room-type-amenity.entity.js';
import { RoomType } from '../../src/room-types/entities/room-type.entity.js';
import {
  ROOM_TYPE_EXPORT_BATCH_SIZE,
  ROOM_TYPE_EXPORT_MAX_ROWS,
} from '../../src/room-types/room-type-export.constants.js';
import { signIn } from '../support/auth.js';
import { createTestApp } from '../support/create-test-app.js';
import { createAmenity } from '../support/factories/amenity.factory.js';
import {
  createRoomType,
  roomTypeAttributes,
} from '../support/factories/room-type.factory.js';
import {
  createUser,
  DEFAULT_PASSWORD,
} from '../support/factories/user.factory.js';
import { resetDb } from '../support/reset-db.js';

import type { INestApplication } from '@nestjs/common';

// Column order of the export: ID, Name, Description, Price, Total, Amenities, Updated at.
const ID = 1;
const NAME = 2;
const PRICE = 4;
const TOTAL_ROOMS = 5;
const AMENITIES = 6;

describe('admin room type export (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDb(app);
    const admin = await createUser(app, { role: 'admin' });
    adminToken = await signIn(app, admin.email, DEFAULT_PASSWORD);
  });

  const http = () => request(app.getHttpServer());

  const exportFile = (query = '', lang?: string) => {
    const req = http()
      .get(`/api/admin/room-types/export${query}`)
      .set('Authorization', adminToken)
      .buffer(true)
      .responseType('blob');
    return lang ? req.set('Accept-Language', lang) : req;
  };

  async function readSheet(body: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(body as never);
    return workbook.worksheets[0];
  }

  // Data rows only, header left out.
  function dataRows(sheet: ExcelJS.Worksheet) {
    return sheet.getRows(2, sheet.rowCount - 1)!.filter((row) => row.hasValues);
  }

  function sheetIds(sheet: ExcelJS.Worksheet) {
    return sheet.rowCount > 1
      ? dataRows(sheet).map((row) => row.getCell(ID).value)
      : [];
  }

  it('sends an xlsx attachment named after the hotel date', async () => {
    const res = await exportFile().expect(200);
    const today = DateTime.now().setZone(HOTEL_TIME_ZONE).toISODate();

    expect(res.headers['content-type']).toBe(XLSX_CONTENT_TYPE);
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="room-types-${today}.xlsx"`,
    );
    expect(Number(res.headers['content-length'])).toBe(res.body.length);
  });

  it('writes one row per room type, prices as numbers and amenities joined', async () => {
    const roomType = await createRoomType(app, {
      name: 'Deluxe Sea View',
      pricePerNight: 1_500_000,
      totalRooms: 0,
      amenities: ['wifi', 'tv'],
    });

    const sheet = await readSheet((await exportFile().expect(200)).body);
    const [row] = dataRows(sheet);

    expect(sheet.rowCount).toBe(2);
    expect(row.getCell(ID).value).toBe(Number(roomType.id));
    expect(row.getCell(NAME).value).toBe('Deluxe Sea View');
    expect(row.getCell(PRICE).value).toBe(1_500_000);
    expect(row.getCell(PRICE).numFmt).toBe('#,##0');
    expect(row.getCell(TOTAL_ROOMS).value).toBe(0);
    expect(row.getCell(AMENITIES).value).toBe('tv, wifi');
  });

  it('keeps a formula-looking name as plain text', async () => {
    await createRoomType(app, { name: '=HYPERLINK("http://evil.test","x")' });

    const sheet = await readSheet((await exportFile().expect(200)).body);
    const cell = dataRows(sheet)[0].getCell(NAME);

    expect(cell.type).toBe(ExcelJS.ValueType.String);
    expect(cell.formula).toBeUndefined();
  });

  it('exports exactly the rows the list shows for the same filters', async () => {
    await createRoomType(app, {
      name: 'Deluxe Twin',
      amenities: ['wifi', 'tv'],
    });
    await createRoomType(app, { name: 'Deluxe King', amenities: ['wifi'] });
    await createRoomType(app, { name: 'Standard', amenities: ['wifi', 'tv'] });
    const filter = '?q=deluxe&amenities=wifi&amenities=tv';

    const list = await http()
      .get(`/api/admin/room-types${filter}&perPage=100`)
      .set('Authorization', adminToken)
      .expect(200);
    const sheet = await readSheet((await exportFile(filter).expect(200)).body);

    const listed = list.body.data.map((item: { id: number }) => item.id);
    expect(listed).toHaveLength(1);
    expect(sheetIds(sheet)).toEqual(listed);
  });

  it('keeps the amenity filter on every batch, not only the first', async () => {
    const dataSource = app.get(DataSource);
    const wifi = await createAmenity(app, { code: 'wifi' });
    const inserted = await dataSource.getRepository(RoomType).insert(
      roomTypeAttributes
        .buildList(ROOM_TYPE_EXPORT_BATCH_SIZE * 3)
        .map(({ name, description, pricePerNight, totalRooms }) => ({
          name,
          description,
          pricePerNight: String(pricePerNight),
          totalRooms,
        })),
    );
    // Every other room type has wifi, so each batch mixes matches and misses.
    const withWifi = inserted.identifiers
      .map(({ id }) => String(id))
      .filter((_, index) => index % 2 === 0);
    await dataSource
      .getRepository(RoomTypeAmenity)
      .insert(
        withWifi.map((roomTypeId) => ({ roomTypeId, amenityId: wifi.id })),
      );

    const sheet = await readSheet(
      (await exportFile('?amenities=wifi').expect(200)).body,
    );

    expect(sheetIds(sheet)).toEqual(withWifi.map(Number).sort((a, b) => a - b));
  });

  it('refuses more room types than the cap, and exports exactly the cap', async () => {
    // Inserted in one statement: a factory call per row would be far slower.
    const roomTypes = app.get(DataSource).getRepository(RoomType);
    await roomTypes.insert(
      roomTypeAttributes
        .buildList(ROOM_TYPE_EXPORT_MAX_ROWS + 1)
        .map(({ name, description, pricePerNight, totalRooms }) => ({
          name,
          description,
          pricePerNight: String(pricePerNight),
          totalRooms,
        })),
    );

    // `exportFile` reads every body as bytes, the JSON error included.
    const refused = await exportFile().expect(422);
    expect(JSON.parse(String(refused.body)).message).toBe(
      'Too many room types to export; narrow the filters',
    );

    const [last] = await roomTypes.find({ order: { id: 'DESC' }, take: 1 });
    await roomTypes.delete({ id: last.id });
    const sheet = await readSheet((await exportFile().expect(200)).body);
    expect(sheet.rowCount).toBe(1 + ROOM_TYPE_EXPORT_MAX_ROWS);
  });

  it('sends only the header row when nothing matches, as for an unknown amenity', async () => {
    await createRoomType(app, { name: 'Standard' });

    for (const query of ['?q=nothing-like-this', '?amenities=no_such_code']) {
      const sheet = await readSheet((await exportFile(query).expect(200)).body);
      expect(sheet.rowCount).toBe(1);
    }
  });

  it('names the sheet and columns in the language asked for, Vietnamese by default', async () => {
    const english = await readSheet(
      (await exportFile('', 'en').expect(200)).body,
    );
    const fallback = await readSheet((await exportFile().expect(200)).body);

    expect(english.name).toBe('Room types');
    expect(english.getRow(1).getCell(NAME).value).toBe('Name');
    expect(fallback.name).toBe('Loại phòng');
    expect(fallback.getRow(1).getCell(NAME).value).toBe('Tên');
  });

  it('rejects an invalid filter before sending any file', async () => {
    const res = await exportFile(`?q=${'x'.repeat(101)}`).expect(400);

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
