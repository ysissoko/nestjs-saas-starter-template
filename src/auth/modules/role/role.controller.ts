import { BaseController } from '@common';
import { ID } from '@common';
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Permission } from '@auth/modules/permission/permission.entity';
import { Role } from '@auth/entities/role.entity';
import { Account } from '@auth/modules/account/account.entity';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { HasPermissionsGuard } from '@guards/has-permissions.guard';
import { HasPermissions } from '@decorators/has-permissions.decorator';
import { Action, Subject } from '@common';
import { Public } from '@auth/decorators/public.decorator';
import { RoleService } from './role.service';

@UseGuards(JwtAuthGuard, HasPermissionsGuard)
@Controller('roles')
export class RoleController extends BaseController<Role> {
  private logger: Logger = new Logger(RoleController.name);

  constructor(private readonly roleService: RoleService) {
    super(roleService);
  }

  @Public()
  @Get('by-name/:name')
  async getByName(@Param('name') name: string): Promise<Role | null> {
    return this.roleService.findOne({ where: { name } });
  }

  /**
   * Override create to add audit logging
   */
  @Post()
  @HasPermissions({ action: Action.Create, subject: Subject.Role })
  async create(@Body() dto: Partial<Role>, @Req() request: Request): Promise<Role> {
    const actor = (request as any).user as Account;
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.roleService.createRole(dto, actor, ipAddress, userAgent);
  }

  /**
   * Override update to add audit logging
   */
  @Patch(':id')
  @HasPermissions({ action: Action.Update, subject: Subject.Role })
  async update(
    @Param('id') id: ID,
    @Body() dto: Partial<Role>,
    @Req() request: Request
  ): Promise<Role> {
    const actor = (request as any).user as Account;
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.roleService.updateRole(id, dto, actor, ipAddress, userAgent);
  }

  /**
   * Override delete to add audit logging
   */
  @Delete(':id')
  @HasPermissions({ action: Action.Delete, subject: Subject.Role })
  async delete(@Param('id') id: ID, @Req() request: Request): Promise<void> {
    const actor = (request as any).user as Account;
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    await this.roleService.deleteRole(id, actor, ipAddress, userAgent);
  }

  @Patch(':id/permissions')
  @HasPermissions({ action: Action.Create, subject: Subject.Permission })
  addPermission(
    @Body() dto: Partial<Permission>,
    @Param('id') roleId: ID,
    @Req() request: Request
  ) {
    const actor = (request as any).user as Account;
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.roleService.addPermission(roleId, dto, actor, ipAddress, userAgent);
  }

  @Delete(':id/permissions/:permissionId')
  @HasPermissions({ action: Action.Delete, subject: Subject.Permission })
  removePermission(
    @Param('id') roleId: number,
    @Param('permissionId') permissionId: string,
    @Req() request: Request
  ) {
    const actor = (request as any).user as Account;
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.roleService.removePermission(roleId, permissionId, actor, ipAddress, userAgent);
  }
}
