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
import type { SelectQueryBuilder } from 'typeorm';

// Revenue is the money Stripe actually took (`payments.amount`), counted on
// the moment it was taken (`paid_at`) — not the agreed price, and not when the
// webhook arrived. Days and months are the hotel's, not UTC's.
@Injectable()
export class RevenueStatisticsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {}

  async report(
    query: RevenueStatisticsQuery,
  ): Promise<RevenueStatisticsResponse> {
    const rows =
      query.groupBy === 'month'
        ? await this.getRevenueByMonth(query)
        : await this.getRevenueByRoomType(query);
    return toRevenueStatisticsResponse(query, rows);
  }

  private async getRevenueByMonth(
    query: RevenueStatisticsQuery,
  ): Promise<RevenueStatisticsRow[]> {
    const rows = await this.createRevenueQuery(query)
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

  private async getRevenueByRoomType(
    query: RevenueStatisticsQuery,
  ): Promise<RevenueStatisticsRow[]> {
    const rows = await this.createRevenueQuery(query)
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

  private createRevenueQuery({
    from,
    to,
    roomTypeId,
  }: RevenueStatisticsQuery): SelectQueryBuilder<Payment> {
    const startInclusive = DateTime.fromISO(from, {
      zone: HOTEL_TIME_ZONE,
    }).toJSDate();
    const endExclusive = DateTime.fromISO(to, { zone: HOTEL_TIME_ZONE })
      .plus({ days: 1 })
      .toJSDate();

    const queryBuilder = this.paymentsRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.bookingRequest', 'booking_request')
      .select('SUM(payment.amount)', 'revenue')
      .addSelect('COUNT(*)', 'payments')
      .where('payment.paid_at >= :startInclusive', { startInclusive })
      .andWhere('payment.paid_at < :endExclusive', { endExclusive });

    if (roomTypeId) {
      queryBuilder.andWhere('booking_request.room_type_id = :roomTypeId', {
        roomTypeId: String(roomTypeId),
      });
    }
    return queryBuilder;
  }
}
