import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Repository } from 'typeorm';

import { HOTEL_TIME_ZONE } from '../booking-requests/booking-request.constants.js';
import { Payment } from '../payment-sessions/payment/entities/payment.entity.js';
import { MONTH_KEY_FORMAT } from './revenue-statistics.constants.js';
import {
  toMonthRevenueRow,
  toRevenueStatisticsResponse,
  toRoomTypeRevenueRow,
} from './revenue-statistics.mapper.js';

import type {
  RawMonthRevenue,
  RawRoomTypeRevenue,
} from './revenue-statistics.interfaces.js';
import type {
  RevenueStatisticsQuery,
  RevenueStatisticsResponse,
  RevenueStatisticsRow,
} from './schemas/revenue-statistics.schema.js';

// Revenue is the money Stripe actually took (`payments.amount`), counted on
// the moment it was taken (`paid_at`) — not the agreed price, and not when the
// webhook arrived. Days and months are the hotel's, not UTC's.
@Injectable()
export class AdminRevenueStatisticsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {}

  async report(
    query: RevenueStatisticsQuery,
  ): Promise<RevenueStatisticsResponse> {
    const data =
      query.groupBy === 'month'
        ? await this.byMonth(query)
        : await this.byRoomType(query);
    return toRevenueStatisticsResponse(query, data);
  }

  private async byMonth(
    query: RevenueStatisticsQuery,
  ): Promise<RevenueStatisticsRow[]> {
    const rows = await this.paymentsIn(query)
      .addSelect(
        'to_char(payment.paid_at AT TIME ZONE :timeZone, :monthKeyFormat)',
        'month',
      )
      .setParameters({
        timeZone: HOTEL_TIME_ZONE,
        monthKeyFormat: MONTH_KEY_FORMAT,
      })
      // Postgres groups and sorts by the output column's name.
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany<RawMonthRevenue>();
    return rows.map(toMonthRevenueRow);
  }

  private async byRoomType(
    query: RevenueStatisticsQuery,
  ): Promise<RevenueStatisticsRow[]> {
    const rows = await this.paymentsIn(query)
      .innerJoin('booking_request.roomType', 'room_type')
      .addSelect('room_type.id', 'roomTypeId')
      .addSelect('room_type.name', 'roomTypeName')
      // `id` is the key, so `name` needs no GROUP BY of its own.
      .groupBy('room_type.id')
      .orderBy('revenue', 'DESC')
      .addOrderBy('room_type.id', 'ASC')
      .getRawMany<RawRoomTypeRevenue>();
    return rows.map(toRoomTypeRevenueRow);
  }

  // The payments taken from the start of `from` up to, but not including,
  // the start of the day after `to`, both in hotel time.
  private paymentsIn({ from, to, roomTypeId }: RevenueStatisticsQuery) {
    const start = DateTime.fromISO(from, { zone: HOTEL_TIME_ZONE });
    const end = DateTime.fromISO(to, { zone: HOTEL_TIME_ZONE }).plus({
      days: 1,
    });

    const builder = this.paymentsRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.bookingRequest', 'booking_request')
      .select('SUM(payment.amount)', 'revenue')
      .addSelect('COUNT(*)', 'payments')
      .where('payment.paid_at >= :start AND payment.paid_at < :end', {
        start: start.toJSDate(),
        end: end.toJSDate(),
      });

    if (roomTypeId !== undefined) {
      builder.andWhere('booking_request.room_type_id = :roomTypeId', {
        roomTypeId: String(roomTypeId),
      });
    }
    return builder;
  }
}
