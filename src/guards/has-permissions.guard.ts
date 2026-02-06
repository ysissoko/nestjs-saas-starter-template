import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountService } from '../auth/modules/account/account.service';
import { Subject } from '@common/enums/acl';
import { PermissionMetadata } from '../decorators/has-permissions.decorator';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';

@Injectable()
export class HasPermissionsGuard implements CanActivate {
  private readonly logger = new Logger(HasPermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly accountService: AccountService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      this.logger.warn('No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    // Retrieve the permission metadata from decorator
    const permissions = this.reflector.get<PermissionMetadata>(
      'permissions',
      context.getHandler(),
    );

    if (!permissions) {
      // No permissions defined - this is allowed (controller developer decides)
      // Could also throw error to enforce explicit permissions
      this.logger.debug('No permissions decorator found on route');
      return true;
    }

    const { action, field, checkResource } = permissions;
    let { subject } = permissions;

    // If subject not explicitly set, infer from controller path
    if (!subject) {
      const controllerPath = this.reflector.get<string>(
        'path',
        context.getClass(),
      );
      if (controllerPath) {
        subject = controllerPath as Subject;
        this.logger.debug(`Inferred subject from controller path: ${subject}`);
      } else {
        this.logger.error('Cannot infer subject: no controller path found');
        throw new ForbiddenException('Permission subject not defined');
      }
    }

    // For resource-level checks (with conditions), fetch the resource
    if (checkResource) {
      const resourceId = request.params.id;
      if (!resourceId) {
        this.logger.warn(
          'Resource ID required for conditional permission check but not found',
        );
        throw new ForbiddenException(
          'Resource ID required for permission check',
        );
      }

      // Standard permission check first
      const hasPermission = await this.accountService.checkPermission({
        userId: user.id,
        action,
        subject,
        field,
      });

      if (!hasPermission) {
        this.logger.warn(
          `User ${user.id} denied ${action} on ${subject} - no base permission`,
        );
        throw new ForbiddenException(
          'You do not have permission to perform this action',
        );
      }

      // Resource will be checked by ResourceOwnerGuard or custom logic
      return true;
    }

    // Standard permission check
    const hasPermission = await this.accountService.checkPermission({
      userId: user.id,
      action,
      subject,
      field,
    });

    if (!hasPermission) {
      this.logger.warn(
        `User ${user.id} (${user.email}) denied ${action} on ${subject}${
          field ? '.' + field : ''
        }`,
      );
      throw new ForbiddenException(
        `You do not have permission to ${action} ${subject}${
          field ? ' field: ' + field : ''
        }`,
      );
    }

    this.logger.debug(
      `User ${user.id} granted ${action} on ${subject}${
        field ? '.' + field : ''
      }`,
    );
    return true;
  }
}
