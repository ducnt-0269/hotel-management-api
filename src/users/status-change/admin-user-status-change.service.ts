import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { User } from '../entities/user.entity.js';
import { UserDeactivation } from './user-deactivation.entity.js';
import { UserReactivation } from './user-reactivation.entity.js';
import { toUserStatusChangeResponse } from './user-status-change.mapper.js';

import type { UserStatusChangeResponse } from './user-status-change.schema.js';

// An admin switches another account off and on again.
@Injectable()
export class AdminUserStatusChangeService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async deactivate(admin: User, id: number): Promise<UserStatusChangeResponse> {
    // Guards against locking every admin out, one self-deactivation at a time.
    if (admin.id === String(id)) {
      throw new ConflictException('You cannot deactivate your own account');
    }
    const user = await this.findUserOrFail(id);
    if (user.status !== 'active') {
      throw new ConflictException('User is not active');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(User, user.id, { status: 'deactivated' });
      const change = await manager.save(UserDeactivation, {
        userId: user.id,
        adminUserId: admin.id,
      });
      return toUserStatusChangeResponse(change);
    });
  }

  async reactivate(admin: User, id: number): Promise<UserStatusChangeResponse> {
    const user = await this.findUserOrFail(id);
    if (user.status !== 'deactivated') {
      throw new ConflictException('User is not deactivated');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(User, user.id, { status: 'active' });
      const change = await manager.save(UserReactivation, {
        userId: user.id,
        adminUserId: admin.id,
      });
      return toUserStatusChangeResponse(change);
    });
  }

  private async findUserOrFail(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id: String(id) });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
