import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EnvService } from '../config/env.service.js';
import { MailModule } from '../mail/mail.module.js';
import { UsersModule } from '../users/users.module.js';
import { AccountActivationService } from './account-activation.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UserEmailVerificationToken } from './entities/user-email-verification-token.entity.js';
import { UserEmailVerification } from './entities/user-email-verification.entity.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { JwtStrategy } from './jwt.strategy.js';

import type { JwtSignOptions } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEmailVerification,
      UserEmailVerificationToken,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [EnvService],
      useFactory: (envService: EnvService) => ({
        secret: envService.get('JWT_SECRET'),
        // `ms` string literal ("1d", "15m"); the env value is only known at runtime.
        signOptions: {
          expiresIn: envService.get(
            'JWT_EXPIRES_IN',
          ) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
    UsersModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccountActivationService,
    JwtStrategy,
    // Authentication is on by default everywhere; @Public() opts out.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Must stay after JwtAuthGuard: global guards run in registration order.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
