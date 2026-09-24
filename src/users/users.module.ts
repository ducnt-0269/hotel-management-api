import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserDeactivation } from './entities/user-deactivation.entity.js';
import { UserReactivation } from './entities/user-reactivation.entity.js';
import { User } from './entities/user.entity.js';
import { MeController } from './me.controller.js';
import { UserManagementService } from './user-management.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserDeactivation, UserReactivation]),
  ],
  controllers: [MeController, UsersController],
  providers: [UsersService, UserManagementService],
  exports: [UsersService],
})
export class UsersModule {}
