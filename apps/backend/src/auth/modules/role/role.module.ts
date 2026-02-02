import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '@auth/entities/role.entity';
import { Permission } from '@auth/modules/permission/permission.entity';
import { AuditLogService } from '@auth/services/audit-log.service';
import { AuditLog } from '@auth/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, AuditLog])],
  providers: [RoleService, AuditLogService],
  controllers: [RoleController],
  exports: [RoleService, AuditLogService],
})
export class RoleModule {}
