import { CommonModule } from '@common';
import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from '@services/email.service';
import { Account } from '@auth/modules/account/account.entity';
import { Otp } from '@auth/entities/otp.entity';
import { Permission } from '@auth/modules/permission/permission.entity';
import { Profile } from '@auth/modules/account/profile.entity';
import { Role } from '@auth/entities/role.entity';
import { OtpService } from '@auth/services/otp.service';
import { TokenService } from '@auth/services/token.service';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { PermissionModule } from '../permission/permission.module';
import { RoleModule } from '../role/role.module';
import { AccountSubscriber } from '../../subscribers/account.subscriber';
import { AuditLog } from '@auth/entities/audit-log.entity';
import { AuditLogService } from '@auth/services/audit-log.service';

@Module({
  imports: [
    CommonModule,
    RoleModule,
    PermissionModule,
    TypeOrmModule.forFeature([
      Account,
      Profile,
      Otp,
      Role,
      Permission,
      AuditLog,
    ]),
  ],
  controllers: [AccountController],
  providers: [
    AccountService,
    JwtService,
    AccountSubscriber,
    EmailService,
    TokenService,
    OtpService,
    AuditLogService,
  ],
  exports: [AccountService, PermissionModule],
})
export class AccountModule {}
