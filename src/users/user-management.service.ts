import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { paginate, toSkipTake } from '../common/pagination/paginate.js';
import { containsText } from '../common/query/like-pattern.js';
import { UserDeactivation } from './entities/user-deactivation.entity.js';
import { UserReactivation } from './entities/user-reactivation.entity.js';
import { User } from './entities/user.entity.js';
import { toUserResponse, toUserStatusChangeResponse } from './user.mapper.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type {
  ListUsersQuery,
  UserResponse,
  UserStatusChangeResponse,
} from './schemas/user.schema.js';
import type { FindOptionsWhere } from 'typeorm';

// What an admin does to other accounts. Self-service lives in UsersService.
@Injectable()
export class UserManagementService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async list(query: ListUsersQuery): Promise<Paginated<UserResponse>> {
    const filters: FindOptionsWhere<User> = {
      ...(query.status && { status: query.status }),
      ...(query.role && { role: query.role }),
    };

    const [rows, total] = await this.usersRepository.findAndCount({
      // An array of conditions is OR-ed, so each one repeats the filters.
      where: query.q
        ? [
            { ...filters, email: containsText(query.q) },
            { ...filters, fullName: containsText(query.q) },
          ]
        : filters,
      order: { id: 'DESC' },
      ...toSkipTake(query),
    });

    return paginate(rows.map(toUserResponse), total, query);
  }

  async findOne(id: number): Promise<UserResponse> {
    return toUserResponse(await this.findUserOrFail(id));
  }

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
