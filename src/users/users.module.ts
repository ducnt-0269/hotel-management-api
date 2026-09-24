import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersService } from './admin-users.service.js';
import { User } from './entities/user.entity.js';
import { MeController } from './me.controller.js';
import { AdminUserStatusChangeController } from './status-change/admin-user-status-change.controller.js';
import { AdminUserStatusChangeService } from './status-change/admin-user-status-change.service.js';
import { UserDeactivation } from './status-change/user-deactivation.entity.js';
import { UserReactivation } from './status-change/user-reactivation.entity.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserDeactivation, UserReactivation]),
  ],
  controllers: [
    MeController,
    AdminUsersController,
    AdminUserStatusChangeController,
  ],
  providers: [UsersService, AdminUsersService, AdminUserStatusChangeService],
  exports: [UsersService],
})
export class UsersModule {}
