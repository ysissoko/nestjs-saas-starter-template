import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { Account } from '../modules/account/account.entity';
import { BaseService, ID } from '@common';

export interface LogActionOptions {
  actor: Account;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  changes?: {
    before?: any;
    after?: any;
  };
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditLogService extends BaseService<AuditLog> {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {
    super(repo);
  }

  /**
   * Log an audit action
   */
  async logAction(options: LogActionOptions): Promise<AuditLog> {
    const {
      actor,
      action,
      entityType,
      entityId,
      changes,
      description,
      ipAddress,
      userAgent,
      metadata,
    } = options;

    try {
      const auditLog = this.repo.create({
        actor,
        action,
        entityType,
        entityId,
        changes,
        description,
        ipAddress,
        userAgent,
        metadata,
      });

      const savedLog = await this.repo.save(auditLog);

      this.logger.log(
        `Audit: ${actor?.email || 'System'} performed ${action} on ${entityType}${entityId ? ` (${entityId})` : ''}`
      );

      return savedLog;
    } catch (error) {
      this.logger.error(`Failed to log audit action: ${error.message}`, error.stack);
      // Don't throw - audit logging should not break the main flow
      return null;
    }
  }

  /**
   * Log permission grant
   */
  async logPermissionGrant(
    actor: Account,
    roleId: ID,
    permission: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditLog> {
    return this.logAction({
      actor,
      action: AuditAction.GRANT_PERMISSION,
      entityType: 'Permission',
      entityId: roleId.toString(),
      changes: {
        after: permission,
      },
      description: `Granted permission: ${permission.action} on ${permission.subject} to role ${roleId}`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log permission revoke
   */
  async logPermissionRevoke(
    actor: Account,
    roleId: ID,
    permissionId: ID,
    permission: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditLog> {
    return this.logAction({
      actor,
      action: AuditAction.REVOKE_PERMISSION,
      entityType: 'Permission',
      entityId: permissionId.toString(),
      changes: {
        before: permission,
      },
      description: `Revoked permission: ${permission.action} on ${permission.subject} from role ${roleId}`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log permission update
   */
  async logPermissionUpdate(
    actor: Account,
    permissionId: ID,
    before: any,
    after: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditLog> {
    return this.logAction({
      actor,
      action: AuditAction.UPDATE_PERMISSION,
      entityType: 'Permission',
      entityId: permissionId.toString(),
      changes: { before, after },
      description: `Updated permission ${permissionId}`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log role assignment
   */
  async logRoleAssignment(
    actor: Account,
    accountId: ID,
    oldRoleId: ID,
    newRoleId: ID,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditLog> {
    return this.logAction({
      actor,
      action: AuditAction.UPDATE_ACCOUNT_ROLE,
      entityType: 'Account',
      entityId: accountId.toString(),
      changes: {
        before: { roleId: oldRoleId },
        after: { roleId: newRoleId },
      },
      description: `Changed role for account ${accountId} from ${oldRoleId} to ${newRoleId}`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log role creation
   */
  async logRoleCreation(
    actor: Account,
    roleId: ID,
    roleName: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditLog> {
    return this.logAction({
      actor,
      action: AuditAction.CREATE_ROLE,
      entityType: 'Role',
      entityId: roleId.toString(),
      changes: {
        after: { name: roleName },
      },
      description: `Created role: ${roleName}`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log role update
   */
  async logRoleUpdate(
    actor: Account,
    roleId: ID,
    before: any,
    after: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditLog> {
    return this.logAction({
      actor,
      action: AuditAction.UPDATE_ROLE,
      entityType: 'Role',
      entityId: roleId.toString(),
      changes: { before, after },
      description: `Updated role ${roleId}`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log role deletion
   */
  async logRoleDeletion(
    actor: Account,
    roleId: ID,
    roleName: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditLog> {
    return this.logAction({
      actor,
      action: AuditAction.DELETE_ROLE,
      entityType: 'Role',
      entityId: roleId.toString(),
      changes: {
        before: { name: roleName },
      },
      description: `Deleted role: ${roleName}`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Get audit logs for a specific entity
   */
  async getAuditLogsForEntity(
    entityType: string,
    entityId: ID,
  ): Promise<AuditLog[]> {
    return this.repo.find({
      where: {
        entityType,
        entityId: entityId.toString(),
      },
      order: { createdAt: 'DESC' },
      relations: ['actor'],
    });
  }

  /**
   * Get audit logs for a specific actor
   */
  async getAuditLogsByActor(actorId: ID): Promise<AuditLog[]> {
    return this.repo.find({
      where: {
        actor: { id: actorId },
      },
      order: { createdAt: 'DESC' },
      relations: ['actor'],
    });
  }

  /**
   * Get audit logs by action type
   */
  async getAuditLogsByAction(action: AuditAction): Promise<AuditLog[]> {
    return this.repo.find({
      where: { action },
      order: { createdAt: 'DESC' },
      relations: ['actor'],
    });
  }

  /**
   * Delete old audit logs (for cleanup)
   */
  async deleteOldAuditLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(
      `Deleted ${result.affected} audit logs older than ${daysToKeep} days`,
    );

    return result.affected || 0;
  }
}
