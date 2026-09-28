import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { I18nService } from 'nestjs-i18n';
import { DataSource } from 'typeorm';

import { HOTEL_TIME_ZONE } from '../booking-requests/booking-request.constants.js';
import { buildXlsx } from '../common/xlsx/xlsx-file.js';
import { adminRoomTypeWhere } from './admin-room-type-filter.js';
import { RoomType } from './entities/room-type.entity.js';
import {
  ROOM_TYPE_EXPORT_BATCH_SIZE,
  ROOM_TYPE_EXPORT_LAYOUT,
  ROOM_TYPE_EXPORT_MAX_ROWS,
} from './room-type-export.constants.js';
import {
  roomTypeExportColumns,
  toRoomTypeExportRow,
} from './room-type-export.mapper.js';

import type { XlsxFile } from '../common/xlsx/xlsx.interfaces.js';
import type { RoomTypeExportRow } from './room-type-export.interfaces.js';
import type { AdminRoomTypeFilter } from './schemas/admin-room-type.schema.js';
import type { EntityManager } from 'typeorm';

@Injectable()
export class AdminRoomTypeExportService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly i18nService: I18nService,
  ) {}

  async export(filter: AdminRoomTypeFilter, lang: string): Promise<XlsxFile> {
    // One snapshot for every batch, as a single query would have seen.
    const rows = await this.dataSource.transaction(
      'REPEATABLE READ',
      (manager) => this.readRows(manager, filter),
    );

    const content = await buildXlsx(
      [
        {
          name: this.t('sheetName', lang),
          layout: ROOM_TYPE_EXPORT_LAYOUT,
          header: (key) => this.t(`columns.${key}`, lang),
          rows,
        },
      ],
      HOTEL_TIME_ZONE,
    );
    const today = DateTime.now().setZone(HOTEL_TIME_ZONE).toISODate();
    return { content, filename: `room-types-${today}.xlsx` };
  }

  // Refuses past the cap before reading a row, then reads 100 at a time by id,
  // like find_each.
  private async readRows(
    manager: EntityManager,
    filter: AdminRoomTypeFilter,
  ): Promise<RoomTypeExportRow[]> {
    const where = adminRoomTypeWhere(filter);
    if (
      (await manager.count(RoomType, { where })) > ROOM_TYPE_EXPORT_MAX_ROWS
    ) {
      throw new UnprocessableEntityException(
        'Too many room types to export; narrow the filters',
      );
    }

    const rows: RoomTypeExportRow[] = [];
    let afterId = '0';
    for (;;) {
      const batch = await manager
        .createQueryBuilder(RoomType, 'roomType')
        .setFindOptions({
          select: roomTypeExportColumns,
          where,
          relations: { amenityLinks: { amenity: true } },
          order: { id: 'ASC' },
          take: ROOM_TYPE_EXPORT_BATCH_SIZE,
        })
        .andWhere('roomType.id > :afterId', { afterId })
        .getMany();

      rows.push(...batch.map(toRoomTypeExportRow));
      if (batch.length < ROOM_TYPE_EXPORT_BATCH_SIZE) return rows;
      afterId = batch[batch.length - 1].id;
    }
  }

  private t(key: string, lang: string): string {
    return this.i18nService.t(`export.roomTypes.${key}`, { lang });
  }
}
