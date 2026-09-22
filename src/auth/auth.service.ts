import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { verifyPassword } from '../common/security/password.js';
import { MailService } from '../mail/mail.service.js';
import { UsersService } from '../users/users.service.js';
import { AccountActivationService } from './account-activation.service.js';

import type { User } from '../users/entities/user.entity.js';
import type { JwtPayload } from './jwt.strategy.js';
import type { LoginBody, RegisterBody } from './schemas/auth.schema.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly accountActivationService: AccountActivationService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  async register(body: RegisterBody): Promise<User> {
    const { user, rawToken } = await this.dataSource.transaction(
      async (manager) => {
        const user = await this.usersService.createUnverified(manager, body);
        return {
          user,
          rawToken: await this.accountActivationService.issueToken(
            manager,
            user,
          ),
        };
      },
    );

    // Enqueued after the commit so a rolled-back registration never mails.
    await this.mailService.enqueueActivationEmail(user, rawToken);
    return user;
  }

  async login({ email, password }: LoginBody) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status !== 'active') {
      throw new ForbiddenException(
        user.status === 'unverified'
          ? 'Account has not been activated'
          : 'Account is deactivated',
      );
    }

    const payload: JwtPayload = { sub: user.id, role: user.role };
    return { accessToken: await this.jwtService.signAsync(payload), user };
  }
}
