import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import { API_TAGS } from '../common/api-docs/api-tags.constants.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
import { AdminRevenueStatisticsService } from './admin-revenue-statistics.service.js';
import {
  revenueStatisticsQuerySchema,
  revenueStatisticsResponseSchema,
} from './schemas/revenue-statistics.schema.js';

import type {
  RevenueStatisticsQuery,
  RevenueStatisticsResponse,
} from './schemas/revenue-statistics.schema.js';

@ApiBearerAuth()
@Roles('admin')
@ApiErrorResponse(403, 'Forbidden')
@ApiTags(API_TAGS.adminStatistics)
@Controller('admin/statistics/revenue')
export class AdminRevenueStatisticsController {
  constructor(
    private readonly adminRevenueStatisticsService: AdminRevenueStatisticsService,
  ) {}

  @Get()
  @RespondsWith(revenueStatisticsResponseSchema, {
    status: 200,
    description:
      'Money taken in the range, by month (oldest first) or by room type (highest first); groups with no payment are left out',
  })
  report(
    @Query({ schema: revenueStatisticsQuerySchema })
    query: RevenueStatisticsQuery,
  ): Promise<RevenueStatisticsResponse> {
    return this.adminRevenueStatisticsService.report(query);
  }
}
