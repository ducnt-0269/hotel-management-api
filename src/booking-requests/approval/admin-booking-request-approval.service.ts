import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { MailService } from '../../mail/mail.service.js';
import { BOOKING_REQUEST_MAIL_SELECT } from '../../mail/templates/booking-request-mail-data.js';
import { BookingRequest } from '../entities/booking-request.entity.js';
import { toBookingRequestApprovalResponse } from './booking-request-approval.mapper.js';
import { BookingRequestApproval } from './entities/booking-request-approval.entity.js';

import type { User } from '../../users/entities/user.entity.js';
import type { BookingRequestApprovalResponse } from './schemas/booking-request-approval.schema.js';

// No capacity re-check: a live pending hold is already counted.
@Injectable()
export class AdminBookingRequestApprovalService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) {}

  async approve(
    admin: User,
    id: number,
  ): Promise<BookingRequestApprovalResponse> {
    const { bookingRequest, response } = await this.dataSource.transaction(
      async (manager) => {
        const bookingRequest = await manager.findOne(BookingRequest, {
          select: {
            ...BOOKING_REQUEST_MAIL_SELECT,
            status: true,
            expiresAt: true,
          },
          relations: { user: true, roomType: true },
          where: { id: String(id) },
        });
        if (!bookingRequest) {
          throw new NotFoundException('Booking request not found');
        }
        if (bookingRequest.status !== 'pending') {
          throw new ConflictException('Booking request is not pending');
        }
        // The capacity check stops counting an overdue hold, so its rooms may
        // already be promised elsewhere; the sweep records the expiry.
        if (bookingRequest.expiresAt <= new Date()) {
          throw new ConflictException('Booking request has expired');
        }

        // Only while still pending: a sweep or cancellation that got there
        // first leaves nothing to update, instead of being overwritten.
        const { affected } = await manager.update(
          BookingRequest,
          { id: bookingRequest.id, status: 'pending' },
          { status: 'approved' },
        );
        if (affected !== 1) {
          throw new ConflictException('Booking request is not pending');
        }
        const approval = await manager.save(BookingRequestApproval, {
          bookingRequestId: bookingRequest.id,
          adminUserId: admin.id,
        });
        return {
          bookingRequest,
          response: toBookingRequestApprovalResponse(approval),
        };
      },
    );

    // Enqueued after the commit so a rolled-back approval never mails.
    await this.mailService.enqueueBookingRequestApprovalEmail(bookingRequest);
    return response;
  }
}
