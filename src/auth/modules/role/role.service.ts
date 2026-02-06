import { Injectable, Logger } from '@nestjs/common';
import { AddPermissionException, RemovePermissionException } from '@common';
import { Role } from '../../entities/role.entity';
import { Permission } from '../permission/permission.entity';
import { Account } from '../account/account.entity';
import { BaseService } from '@common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ID } from '@common';
import { AuditLogService } from '../../services/audit-log.service';

@Injectable()
export class RoleService extends BaseService<Role> {
  private logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role) private readonly repo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    private readonly auditLogService: AuditLogService,
  ) {
    super(repo);
  }

  async addPermission(
    roleId: ID,
    permission: Partial<Permission>,
    actor?: Account,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      // Find the role
      const role: Role = await this.repo.findOneOrFail({
        where: { id: roleId },
        relations: ['permissions'],
      });

      if (!role) {
        throw new Error(`Role with id ${roleId} not found`);
      }

      // Create new permission
      const newPermission = this.permissionRepo.create(permission);

      // Save the new permission
      const savedPermission = await this.permissionRepo.save(newPermission);

      // Add to role's permissions array
      if (!role.permissions) {
        role.permissions = [];
      }
      role.permissions.push(savedPermission);

      // Save the updated role
      const updatedRole = await role.save();

      // Audit log
      if (actor) {
        await this.auditLogService.logPermissionGrant(
          actor,
          roleId,
          {
            action: savedPermission.action,
            subject: savedPermission.subject,
            fields: savedPermission.fields,
            conditions: savedPermission.conditions,
          },
          ipAddress,
          userAgent,
        );
      }

      return updatedRole;
    } catch (error) {
      this.logger.error(error);
      throw new AddPermissionException(
        `error adding permission to role id ${roleId}`,
      );
    }
  }

  async removePermission(
    roleId: ID,
    permissionId: string,
    actor?: Account,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      // Find the role with its permissions
      const role = await this.repo.findOneOrFail({
        where: { id: roleId },
        relations: ['permissions'],
      });

      if (!role) {
        throw new Error(`Role with id ${roleId} not found`);
      }

      if (!role.permissions) {
        throw new Error(`Role with id ${roleId} has no permissions`);
      }

      // Find the permission to remove (for audit logging)
      const permissionToRemove = role.permissions.find(
        (permission) => permission.id.toString() === permissionId.toString(),
      );

      if (!permissionToRemove) {
        throw new Error(
          `Permission with id ${permissionId} not found in role ${roleId}`,
        );
      }

      // Audit log before deletion
      if (actor) {
        await this.auditLogService.logPermissionRevoke(
          actor,
          roleId,
          Number(permissionId),
          {
            action: permissionToRemove.action,
            subject: permissionToRemove.subject,
            fields: permissionToRemove.fields,
            conditions: permissionToRemove.conditions,
          },
          ipAddress,
          userAgent,
        );
      }

      // Filter out the permission to remove
      role.permissions = role.permissions.filter(
        (permission) => permission.id.toString() !== permissionId.toString(),
      );

      // Save the updated role
      await role.save();

      // Also delete the permission entity
      return await this.permissionRepo.delete(permissionId);
    } catch (error) {
      this.logger.error(error);
      throw new RemovePermissionException(
        `Error removing permission (${permissionId}) from role (${roleId})`,
      );
    }
  }

  /**
   * Create a new role with audit logging
   */
  async createRole(
    roleData: Partial<Role>,
    actor?: Account,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Role> {
    try {
      const newRole = this.repo.create(roleData);
      const savedRole = await this.repo.save(newRole);

      // Audit log
      if (actor) {
        await this.auditLogService.logRoleCreation(
          actor,
          savedRole.id,
          savedRole.name,
          ipAddress,
          userAgent,
        );
      }

      return savedRole;
    } catch (error) {
      this.logger.error(`Error creating role: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update a role with audit logging
   */
  async updateRole(
    roleId: ID,
    updateData: Partial<Role>,
    actor?: Account,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Role> {
    try {
      // Get the role before update for comparison
      const roleBefore = await this.repo.findOne({ where: { id: roleId } });

      if (!roleBefore) {
        throw new Error(`Role with id ${roleId} not found`);
      }

      // Update the role
      await this.repo.update(roleId, updateData);
      const roleAfter = await this.repo.findOne({ where: { id: roleId } });

      // Audit log
      if (actor) {
        await this.auditLogService.logRoleUpdate(
          actor,
          roleId,
          {
            before: roleBefore,
            after: roleAfter,
          },
          ipAddress,
          userAgent,
        );
      }

      return roleAfter;
    } catch (error) {
      this.logger.error(
        `Error updating role ${roleId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete a role with audit logging
   */
  async deleteRole(
    roleId: ID,
    actor?: Account,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      // Get role before deletion
      const role = await this.repo.findOne({
        where: { id: roleId },
        relations: ['permissions'],
      });

      if (!role) {
        throw new Error(`Role with id ${roleId} not found`);
      }

      // Delete the role
      await this.repo.delete(roleId);

      // Audit log
      if (actor) {
        await this.auditLogService.logRoleDeletion(
          actor,
          roleId,
          role.name,
          ipAddress,
          userAgent,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error deleting role ${roleId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
