import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { User } from '../entities/user.entity.js';
import { UserReactivation } from './entities/user-reactivation.entity.js';
import { toUserReactivationResponse } from './user-reactivation.mapper.js';

import type { UserReactivationResponse } from './schemas/user-reactivation.schema.js';

// An admin switches a deactivated account back on.
@Injectable()
export class AdminUserReactivationService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async reactivate(admin: User, id: number): Promise<UserReactivationResponse> {
    const user = await this.findUserOrFail(id);
    if (user.status !== 'deactivated') {
      throw new ConflictException('User is not deactivated');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(User, user.id, { status: 'active' });
      const reactivation = await manager.save(UserReactivation, {
        userId: user.id,
        adminUserId: admin.id,
      });
      return toUserReactivationResponse(reactivation);
    });
  }

  private async findUserOrFail(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id: String(id) });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
