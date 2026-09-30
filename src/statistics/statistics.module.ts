import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Payment } from '../payment-sessions/payment/entities/payment.entity.js';
import { AdminRevenueStatisticsController } from './admin-revenue-statistics.controller.js';
import { AdminRevenueStatisticsService } from './admin-revenue-statistics.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [AdminRevenueStatisticsController],
  providers: [AdminRevenueStatisticsService],
})
export class StatisticsModule {}
