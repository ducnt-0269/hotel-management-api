import { Module } from '@nestjs/common';

import { AppModule } from '../app.module.js';
import { StatisticsModule } from '../statistics/statistics.module.js';
import { MonthlyRevenueReportCommand } from './commands/monthly-revenue-report.command.js';

// Root module of `cli.ts`: the whole app plus the commands, so the HTTP server
// never instantiates a command. Each command's module is imported here for the
// service it exports.
@Module({
  imports: [AppModule, StatisticsModule],
  providers: [MonthlyRevenueReportCommand],
})
export class CliModule {}
