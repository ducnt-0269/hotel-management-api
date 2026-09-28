import { Controller, Get, SerializeOptions } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { z } from 'zod';

import { Public } from '../auth/decorators/public.decorator.js';
import { API_TAGS } from '../common/api-docs/api-tags.constants.js';

const healthResponseSchema = z.object({ status: z.literal('ok') });

@Public()
@ApiTags(API_TAGS.health)
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @SerializeOptions({ schema: healthResponseSchema })
  async check() {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok' as const };
  }
}
