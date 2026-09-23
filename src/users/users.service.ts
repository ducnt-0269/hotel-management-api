import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';

import { hashPassword, verifyPassword } from '../common/security/password.js';
import { User } from './entities/user.entity.js';
import { toUserResponse } from './user.mapper.js';

import type {
  ChangePasswordBody,
  UpdateProfileBody,
  UserResponse,
} from './schemas/user.schema.js';

const UNIQUE_VIOLATION = '23505';

// Emails are compared case-insensitively by storing them lower-cased under a
// plain UNIQUE index (database-design.md `## Deviations`).
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface NewUser {
  email: string;
  password: string;
  fullName: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email: normalizeEmail(email) });
  }

  // Takes the caller's manager so registration can insert the user and its
  // activation token in one transaction.
  async createUnverified(manager: EntityManager, data: NewUser): Promise<User> {
    const user = manager.create(User, {
      email: normalizeEmail(data.email),
      passwordHash: await hashPassword(data.password),
      fullName: data.fullName,
      role: 'user',
      status: 'unverified',
    });

    try {
      return await manager.save(user);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async updateProfile(
    user: User,
    { fullName }: UpdateProfileBody,
  ): Promise<UserResponse> {
    user.fullName = fullName;
    return toUserResponse(await this.usersRepository.save(user));
  }

  async changePassword(
    user: User,
    { currentPassword, newPassword }: ChangePasswordBody,
  ): Promise<void> {
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is wrong');
    }
    user.passwordHash = await hashPassword(newPassword);
    await this.usersRepository.save(user);
  }
}
