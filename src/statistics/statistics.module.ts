import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailModule } from '../mail/mail.module.js';
import { Payment } from '../payment-sessions/payment/entities/payment.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AdminRevenueStatisticsController } from './admin-revenue-statistics.controller.js';
import { MonthlyRevenueReportService } from './monthly-revenue-report.service.js';
import { RevenueStatisticsService } from './revenue-statistics.service.js';

@Module({
  imports: [MailModule, TypeOrmModule.forFeature([Payment, User])],
  controllers: [AdminRevenueStatisticsController],
  providers: [RevenueStatisticsService, MonthlyRevenueReportService],
})
export class StatisticsModule {}
