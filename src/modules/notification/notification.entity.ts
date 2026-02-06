import { Account } from '@auth/modules/account/account.entity';
import { TypeormBaseEntity } from '@common';
import { Column, Entity, ManyToOne } from 'typeorm';

@Entity('notifications')
export class Notification extends TypeormBaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 200 })
  message: string;

  @ManyToOne(() => Account, (account) => account.receivedNotifications)
  recipient: Account;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;
}
