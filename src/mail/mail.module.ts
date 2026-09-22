import { MailerModule, MailerQueueModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';

import { EnvService } from '../config/env.service.js';
import { MailService } from './mail.service.js';

// MailerQueueModule brings its own BullMQ queue and worker, so there is no
// hand-written processor: enqueue() puts the rendered mail on Redis and the
// worker hands it to MailerService.
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [],
      inject: [EnvService],
      useFactory: (envService: EnvService) => ({
        transport: {
          host: envService.get('MAIL_HOST'),
          port: envService.get('MAIL_PORT'),
          secure: false,
          ignoreTLS: true,
        },
        defaults: { from: envService.get('MAIL_FROM') },
      }),
    }),
    MailerQueueModule.registerAsync({
      inject: [EnvService],
      useFactory: (envService: EnvService) => ({
        connection: {
          host: envService.get('REDIS_HOST'),
          port: envService.get('REDIS_PORT'),
        },
        queueName: 'mail',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
