import { Module } from '@nestjs/common';
import { CaslAbilityService } from './casl-ability.service';
import { PermissionManagementController } from './permission-management.controller';
import { CommonModule } from '@common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConditionResolverService } from '@auth/services/condition-resolver.service';
import { RoleModule } from '../role/role.module';
import { AuditLog } from '@auth/entities/audit-log.entity';
import { Permission } from './permission.entity';
import { Role } from '@auth/entities/role.entity';
import { AuditLogService } from '@auth/services/audit-log.service';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([Role, Permission, AuditLog]),
    RoleModule,
  ],
  controllers: [PermissionManagementController],
  providers: [CaslAbilityService, AuditLogService, ConditionResolverService],
  exports: [CaslAbilityService, AuditLogService, ConditionResolverService],
})
export class PermissionModule {}
