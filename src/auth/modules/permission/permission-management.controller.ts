import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Logger,
  Delete,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { HasPermissionsGuard } from '@guards/has-permissions.guard';
import { HasPermissions } from '@decorators/has-permissions.decorator';
import { Action, Subject } from '@common';
import { Account } from '@auth/modules/account/account.entity';
import { ID } from '@common';
import { CaslAbilityService } from './casl-ability.service';
import { RoleService } from '../role/role.service';
import { AuditLogService } from '@auth/services/audit-log.service';

/**
 * DTO for testing user permissions
 */
export class TestPermissionDto {
  userId: ID;
  action: Action;
  subject: Subject;
  field?: string;
  resourceData?: any;
}

/**
 * DTO for bulk permission operations
 */
export class BulkPermissionDto {
  roleId: ID;
  permissions: Array<{
    action: Action | Action[];
    subject: Subject | Subject[];
    fields?: string[];
    conditions?: Record<string, any>;
    inverted?: boolean;
    reason?: string;
  }>;
}

/**
 * DTO for permission update
 */
export class UpdatePermissionDto {
  action?: Action | Action[];
  subject?: Subject | Subject[];
  fields?: string[];
  conditions?: Record<string, any>;
  inverted?: boolean;
  reason?: string;
}

/**
 * Controller for managing and testing permissions
 */
@Controller('permission-management')
@UseGuards(JwtAuthGuard, HasPermissionsGuard)
export class PermissionManagementController {
  private logger = new Logger(PermissionManagementController.name);

  constructor(
    private readonly caslAbilityService: CaslAbilityService,
    private readonly roleService: RoleService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Get the permission matrix for all subjects and actions
   */
  @Get('matrix')
  @HasPermissions({ action: Action.Read, subject: Subject.Permission })
  async getPermissionMatrix() {
    const subjects = Object.values(Subject);
    const actions = Object.values(Action);

    return {
      subjects,
      actions,
      matrix: subjects.map(subject => ({
        subject,
        actions: actions.map(action => ({
          action,
          key: `${action}:${subject}`,
        })),
      })),
    };
  }

  /**
   * Get role permissions in matrix format
   */
  @Get('matrix/role/:roleId')
  @HasPermissions({ action: Action.Read, subject: Subject.Permission })
  async getRolePermissionMatrix(@Param('roleId') roleId: ID) {
    const role = await this.roleService.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new Error(`Role with id ${roleId} not found`);
    }

    const subjects = Object.values(Subject);
    const actions = Object.values(Action);

    // Create a map of permissions for quick lookup
    const permissionMap = new Map<string, any>();

    role.permissions?.forEach(permission => {
      const subjectsArray = Array.isArray(permission.subject)
        ? permission.subject
        : [permission.subject];
      const actionsArray = Array.isArray(permission.action)
        ? permission.action
        : [permission.action];

      subjectsArray.forEach(subject => {
        actionsArray.forEach(action => {
          const key = `${action}:${subject}`;
          permissionMap.set(key, {
            granted: !permission.inverted,
            fields: permission.fields,
            conditions: permission.conditions,
            reason: permission.reason,
            permissionId: permission.id,
          });
        });
      });
    });

    return {
      role: {
        id: role.id,
        name: role.name,
      },
      matrix: subjects.map(subject => ({
        subject,
        actions: actions.map(action => {
          const key = `${action}:${subject}`;
          const permission = permissionMap.get(key);
          return {
            action,
            key,
            granted: permission?.granted || false,
            fields: permission?.fields,
            conditions: permission?.conditions,
            reason: permission?.reason,
            permissionId: permission?.permissionId,
          };
        }),
      })),
    };
  }

  /**
   * Test if a user has a specific permission
   */
  @Post('test')
  @HasPermissions({ action: Action.Read, subject: Subject.Permission })
  async testPermission(@Body() dto: TestPermissionDto) {
    const { userId, action, subject, field, resourceData } = dto;

    // Get the user
    const user = await this.roleService['accountRepository']?.findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions'],
    });

    if (!user) {
      return {
        userId,
        action,
        subject,
        field,
        hasPermission: false,
        reason: 'User not found',
      };
    }

    // Check permission
    let hasPermission = false;
    let reason = '';

    try {
      if (resourceData) {
        // Check with resource-level conditions
        hasPermission = await this.caslAbilityService.checkUserAbilityWithConditions(
          user,
          action,
          resourceData,
          field,
        );
        reason = hasPermission
          ? 'Permission granted with resource conditions'
          : 'Permission denied by resource conditions';
      } else {
        // Check basic permission
        hasPermission = await this.caslAbilityService.checkUserAbility(
          user,
          action,
          subject,
          field,
        );
        reason = hasPermission ? 'Permission granted' : 'Permission denied';
      }
    } catch (error) {
      this.logger.error(`Error testing permission: ${error.message}`, error.stack);
      hasPermission = false;
      reason = `Error: ${error.message}`;
    }

    return {
      userId,
      user: {
        id: user.id,
        email: user.email,
        role: user.role?.name,
      },
      action,
      subject,
      field,
      resourceData,
      hasPermission,
      reason,
    };
  }

  /**
   * Bulk add permissions to a role
   */
  @Post('bulk-add')
  @HasPermissions({ action: Action.Create, subject: Subject.Permission })
  async bulkAddPermissions(@Body() dto: BulkPermissionDto, @Req() request: Request) {
    const { roleId, permissions } = dto;
    const actor = (request as any).user as Account;
    const ipAddress = request.ip || request.socket?.remoteAddress;
    const userAgent = request.headers['user-agent'];

    const results = [];

    for (const permission of permissions) {
      try {
        const result = await this.roleService.addPermission(
          roleId,
          permission,
          actor,
          ipAddress,
          userAgent,
        );
        results.push({
          success: true,
          permission,
          role: result,
        });
      } catch (error) {
        this.logger.error(
          `Error adding permission to role ${roleId}: ${error.message}`,
          error.stack,
        );
        results.push({
          success: false,
          permission,
          error: error.message,
        });
      }
    }

    // Refresh the role's ability cache
    await this.caslAbilityService.refreshRoleAbility(roleId);

    return {
      roleId,
      results,
      summary: {
        total: permissions.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    };
  }

  /**
   * Bulk remove permissions from a role
   */
  @Delete('bulk-remove')
  @HasPermissions({ action: Action.Delete, subject: Subject.Permission })
  async bulkRemovePermissions(
    @Body() dto: { roleId: ID; permissionIds: string[] },
    @Req() request: Request,
  ) {
    const { roleId, permissionIds } = dto;
    const actor = (request as any).user as Account;
    const ipAddress = request.ip || request.socket?.remoteAddress;
    const userAgent = request.headers['user-agent'];

    const results = [];

    for (const permissionId of permissionIds) {
      try {
        await this.roleService.removePermission(
          roleId,
          permissionId,
          actor,
          ipAddress,
          userAgent,
        );
        results.push({
          success: true,
          permissionId,
        });
      } catch (error) {
        this.logger.error(
          `Error removing permission ${permissionId} from role ${roleId}: ${error.message}`,
          error.stack,
        );
        results.push({
          success: false,
          permissionId,
          error: error.message,
        });
      }
    }

    // Refresh the role's ability cache
    await this.caslAbilityService.refreshRoleAbility(roleId);

    return {
      roleId,
      results,
      summary: {
        total: permissionIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    };
  }

  /**
   * Get audit logs with pagination
   */
  @Get('audit-logs')
  @HasPermissions({ action: Action.Read, subject: Subject.AuditLog })
  async getAuditLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('action') action?: string,
    @Query('actorId') actorId?: ID,
    @Query('entityType') entityType?: string,
  ) {
    const filters: any = {};
    if (action) filters.action = action;
    if (actorId) filters.actor = { id: actorId };
    if (entityType) filters.entityType = entityType;

    return this.auditLogService.paginate({
      page,
      limit,
      where: filters,
    });
  }

  /**
   * Get audit logs for a specific entity
   */
  @Get('audit-logs/entity/:entityType/:entityId')
  @HasPermissions({ action: Action.Read, subject: Subject.AuditLog })
  async getEntityAuditLogs(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.auditLogService.getAuditLogsForEntity(entityType, Number(entityId));
  }

  /**
   * Get audit logs by actor (user)
   */
  @Get('audit-logs/actor/:actorId')
  @HasPermissions({ action: Action.Read, subject: Subject.AuditLog })
  async getActorAuditLogs(
    @Param('actorId') actorId: ID,
    @Query('limit') limit: number = 50,
  ) {
    return this.auditLogService.getAuditLogsByActor(actorId);
  }

  /**
   * Clear abilities cache (admin only)
   */
  @Post('cache/clear')
  @HasPermissions({ action: Action.Manage, subject: Subject.Permission })
  async clearAbilitiesCache() {
    this.caslAbilityService.clearAbilitiesCache();
    return {
      success: true,
      message: 'Abilities cache cleared successfully',
    };
  }

  /**
   * Refresh role ability cache
   */
  @Post('cache/refresh/:roleId')
  @HasPermissions({ action: Action.Update, subject: Subject.Permission })
  async refreshRoleAbility(@Param('roleId') roleId: ID) {
    await this.caslAbilityService.refreshRoleAbility(roleId);
    return {
      success: true,
      message: `Role ${roleId} ability cache refreshed successfully`,
    };
  }
}
