import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { paginate, toSkipTake } from '../common/pagination/paginate.js';
import { containsText } from '../common/query/find-operators.js';
import { User } from './entities/user.entity.js';
import { toUserResponse } from './user.mapper.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type { ListUsersQuery, UserResponse } from './schemas/user.schema.js';
import type { FindOptionsWhere } from 'typeorm';

// An admin looks accounts up. Switching them off and on lives in
// status-change/; self-service lives in UsersService.
@Injectable()
export class AdminUsersService {
  constructor(
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

  private async findUserOrFail(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id: String(id) });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
