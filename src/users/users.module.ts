import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminUserDeactivationController } from './deactivation/admin-user-deactivation.controller.js';
import { AdminUserDeactivationService } from './deactivation/admin-user-deactivation.service.js';
import { UserDeactivation } from './deactivation/entities/user-deactivation.entity.js';
import { User } from './entities/user.entity.js';
import { MeController } from './me.controller.js';
import { AdminUserReactivationController } from './reactivation/admin-user-reactivation.controller.js';
import { AdminUserReactivationService } from './reactivation/admin-user-reactivation.service.js';
import { UserReactivation } from './reactivation/entities/user-reactivation.entity.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserDeactivation, UserReactivation]),
  ],
  controllers: [
    MeController,
    AdminUsersController,
    AdminUserDeactivationController,
    AdminUserReactivationController,
  ],
  providers: [
    UsersService,
    AdminUsersService,
    AdminUserDeactivationService,
    AdminUserReactivationService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
