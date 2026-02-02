import { Column, Entity, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TypeormBaseEntity } from '@common';
import { Account } from '@auth/modules/account/account.entity';

export enum AuditAction {
  // Authentication actions
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',

  // Account actions
  CREATE_ACCOUNT = 'CREATE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  SUSPEND_ACCOUNT = 'SUSPEND_ACCOUNT',
  ACTIVATE_ACCOUNT = 'ACTIVATE_ACCOUNT',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',

  // Role actions
  CREATE_ROLE = 'CREATE_ROLE',
  UPDATE_ROLE = 'UPDATE_ROLE',
  DELETE_ROLE = 'DELETE_ROLE',
  ASSIGN_ROLE = 'ASSIGN_ROLE',
  REVOKE_ROLE = 'REVOKE_ROLE',
  UPDATE_ACCOUNT_ROLE = 'UPDATE_ACCOUNT_ROLE',

  // Permission actions
  GRANT_PERMISSION = 'GRANT_PERMISSION',
  REVOKE_PERMISSION = 'REVOKE_PERMISSION',
  UPDATE_PERMISSION = 'UPDATE_PERMISSION',

  // Data actions
  EXPORT_DATA = 'EXPORT_DATA',
  IMPORT_DATA = 'IMPORT_DATA',

  // API actions
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',

  // Payment/Subscription actions
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  PAYMENT_SUCCEEDED = 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',

  // Generic actions
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['action'])
@Index(['createdAt'])
export class AuditLog extends TypeormBaseEntity {
  @ManyToOne(() => Account, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  @Index()
  actor: Account;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  @Index()
  action: AuditAction;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  entityType: string; // 'Permission', 'Role', 'Account', etc.

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityId: string; // ID of the affected entity

  @Column({ type: 'json', nullable: true })
  changes: {
    before?: any;
    after?: any;
  }; // Before/after snapshot

  @Column({ type: 'text', nullable: true })
  description: string; // Human-readable description of the action

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>; // Additional context-specific data
}
