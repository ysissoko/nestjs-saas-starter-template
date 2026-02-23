import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { Notification } from '@modules/notification/notification.entity';
import { ConfigModule } from '@nestjs/config';
import { Account } from '@auth/modules/account/account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, Account]),
    ConfigModule,
  ],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
