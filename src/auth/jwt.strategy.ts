import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { EnvService } from '../config/env.service.js';
import { UsersService } from '../users/users.service.js';

import type { User, UserRole } from '../users/entities/user.entity.js';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  ver: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    envService: EnvService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envService.get('JWT_SECRET'),
    });
  }

  // Re-read the user on every request so deactivation, logout and a password
  // change kill the tokens already in the wild.
  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findById(payload.sub);
    if (
      !user ||
      user.status !== 'active' ||
      user.tokenVersion !== payload.ver
    ) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
