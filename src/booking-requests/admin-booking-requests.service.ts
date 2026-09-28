import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { paginate, toSkipTake } from '../common/pagination/paginate.js';
import {
  adminBookingRequestResponseColumns,
  toAdminBookingRequestResponse,
} from './admin-booking-request.mapper.js';
import { findBookingRequestOutcomes } from './booking-request-outcomes.js';
import { BookingRequest } from './entities/booking-request.entity.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type {
  AdminBookingRequestResponse,
  ListBookingRequestsQuery,
} from './schemas/admin-booking-request.schema.js';

// An admin looks requests up. Deciding on them lives in approval/ and
// rejection/.
@Injectable()
export class AdminBookingRequestsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(BookingRequest)
    private readonly bookingRequestsRepository: Repository<BookingRequest>,
  ) {}

  async list(
    query: ListBookingRequestsQuery,
  ): Promise<Paginated<AdminBookingRequestResponse>> {
    const { status, roomTypeId, userId } = query;
    const [rows, total] = await this.bookingRequestsRepository.findAndCount({
      select: adminBookingRequestResponseColumns,
      where: {
        ...(status && { status }),
        ...(roomTypeId && { roomTypeId: String(roomTypeId) }),
        ...(userId && { userId: String(userId) }),
      },
      relations: { roomType: true, user: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      ...toSkipTake(query),
    });
    const [payments, rejections] = await findBookingRequestOutcomes(
      this.dataSource.manager,
      rows.map((row) => row.id),
    );
    return paginate(
      rows.map((row) =>
        toAdminBookingRequestResponse(row, row.user, payments, rejections),
      ),
      total,
      query,
    );
  }

  async findOne(id: number): Promise<AdminBookingRequestResponse> {
    const bookingRequest = await this.bookingRequestsRepository.findOne({
      select: adminBookingRequestResponseColumns,
      where: { id: String(id) },
      relations: { roomType: true, user: true },
    });
    if (!bookingRequest) {
      throw new NotFoundException('Booking request not found');
    }
    const [payments, rejections] = await findBookingRequestOutcomes(
      this.dataSource.manager,
      [bookingRequest.id],
    );
    return toAdminBookingRequestResponse(
      bookingRequest,
      bookingRequest.user,
      payments,
      rejections,
    );
  }
}
