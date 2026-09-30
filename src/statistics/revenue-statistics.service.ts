import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Brackets, Repository } from 'typeorm';

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
//
// Each grouping writes its whole query top to bottom; only the filter, which
// both must apply identically, is shared.
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
    const rows = await this.paymentsRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.bookingRequest', 'booking_request')
      .select(
        'to_char(payment.paid_at AT TIME ZONE :timeZone, :monthKeyFormat)',
        'month',
      )
      .addSelect('SUM(payment.amount)', 'revenue')
      .addSelect('COUNT(*)', 'payments')
      .setParameters({
        timeZone: HOTEL_TIME_ZONE,
        monthKeyFormat: MONTH_KEY_FORMAT,
      })
      .where(paidWithin(query))
      // Postgres groups and sorts by the output column's name.
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany<RawMonthRevenue>();
    return rows.map(toMonthRevenueRow);
  }

  private async getRevenueByRoomType(
    query: RevenueStatisticsQuery,
  ): Promise<RevenueStatisticsRow[]> {
    const rows = await this.paymentsRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.bookingRequest', 'booking_request')
      .innerJoin('booking_request.roomType', 'room_type')
      .select('room_type.id', 'roomTypeId')
      .addSelect('room_type.name', 'roomTypeName')
      .addSelect('SUM(payment.amount)', 'revenue')
      .addSelect('COUNT(*)', 'payments')
      .where(paidWithin(query))
      // `id` is the key, so `name` needs no GROUP BY of its own.
      .groupBy('room_type.id')
      .orderBy('revenue', 'DESC')
      .addOrderBy('room_type.id', 'ASC')
      .getRawMany<RawRoomTypeRevenue>();
    return rows.map(toRoomTypeRevenueRow);
  }
}

// Payments taken from the first hotel-time moment of `from` up to, not
// including, the first moment of the day after `to`; optionally of one room
// type. Expects the query to have joined `booking_request`.
function paidWithin({ from, to, roomTypeId }: RevenueStatisticsQuery) {
  const startInclusive = DateTime.fromISO(from, {
    zone: HOTEL_TIME_ZONE,
  }).toJSDate();
  const endExclusive = DateTime.fromISO(to, { zone: HOTEL_TIME_ZONE })
    .plus({ days: 1 })
    .toJSDate();

  return new Brackets((where) => {
    where
      .where('payment.paid_at >= :startInclusive', { startInclusive })
      .andWhere('payment.paid_at < :endExclusive', { endExclusive });
    if (roomTypeId) {
      where.andWhere('booking_request.room_type_id = :roomTypeId', {
        roomTypeId: String(roomTypeId),
      });
    }
  });
}
