import { TypeormBaseEntity } from '@common';
import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Otp } from '../../entities/otp.entity';
import { Profile } from './profile.entity';
import { Role } from '../../entities/role.entity';
import { Notification } from '@modules/notification/notification.entity';

export type EmailVerificationTokenPayload = {
  email: string;
};

export enum AccountState {
  NOT_VERIFIED = 'NOT VERIFIED',
  VERIFIED = 'VERIFIED',
  BLOCKED = 'BLOCKED',
}

@Entity('accounts')
export class Account extends TypeormBaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({ nullable: true, unique: true })
  googleId: string;

  @Column({ nullable: true, unique: true })
  facebookId: string;

  // Define a many-to-one relationship but don't embed
  @ManyToOne(() => Role, (role) => role.accounts, { eager: true })
  role: Role;

  @Column({ default: 0 })
  @Exclude({ toPlainOnly: true })
  loginAttempts: number;

  @Column({
    type: 'enum',
    enum: AccountState,
    default: AccountState.NOT_VERIFIED,
  })
  accountState: string = AccountState.NOT_VERIFIED;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  emailVerificationToken: string;

  @Column({ nullable: true, default: null })
  @Exclude({ toPlainOnly: true })
  resetPasswordToken: string;

  @Column({ nullable: true })
  stripeCustomerId: string;

  @OneToOne(() => Profile, {
    cascade: true,
    eager: true,
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  profile: Profile;

  @OneToOne(() => Otp, { cascade: true, eager: true, onDelete: 'CASCADE' })
  @JoinColumn()
  otp: Otp;

  @Column({ type: 'json', nullable: true })
  preferences: Record<string, any>;

  @OneToMany(() => Notification, (notification) => notification.recipient, {
    onDelete: 'CASCADE',
  })
  receivedNotifications: Notification[];
}
