import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityService } from '../auth/modules/permission/casl-ability.service';
import { Action } from '@common';

export interface ResourceOwnerMetadata {
    resourceGetter: (request: any, service?: any) => Promise<any>;
    ownerField?: string; // Default: 'userId' or 'accountId'
    tenantField?: string; // Default: 'tenantId'
    allowAdminOverride?: boolean; // Allow admins to bypass ownership check
}

/**
 * Guard that checks if the user owns the resource they're trying to access.
 *
 * If the user is not the owner, it checks if they have override permissions
 * (e.g., admin with 'manage' permission on that resource).
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, HasPermissionsGuard, ResourceOwnerGuard)
 * @CheckResourceOwner({
 *   resourceGetter: async (req) => await service.findById(req.params.id),
 *   ownerField: 'account.id'
 * })
 */
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
    private readonly logger = new Logger(ResourceOwnerGuard.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly caslAbilityService: CaslAbilityService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const metadata = this.reflector.get<ResourceOwnerMetadata>(
            'resourceOwner',
            context.getHandler()
        );

        if (!metadata) {
            // No ownership check required
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const { user } = request;

        if (!user) {
            this.logger.warn('No user found in request for ownership check');
            throw new ForbiddenException('User not authenticated');
        }

        const { resourceGetter, ownerField = 'ownerId', tenantField = 'tenantId', allowAdminOverride = true } = metadata;

        try {
            // Fetch the resource using the provided getter
            const resource = await resourceGetter(request, null);

            if (!resource) {
                this.logger.warn(`Resource not found for ownership check`);
                throw new ForbiddenException('Resource not found');
            }

            // Extract owner ID from resource using the ownerField path
            const ownerId = this.getNestedProperty(resource, ownerField);

            if (!ownerId) {
                this.logger.warn(`Owner field '${ownerField}' not found in resource`);
                throw new ForbiddenException('Cannot determine resource ownership');
            }

            // Check if user is the owner
            const isOwner = ownerId === user.id || ownerId?.id === user.id || ownerId === user.id?.toString();

            if (isOwner) {
                this.logger.debug(`User ${user.id} is owner of resource`);
                return true;
            }

            // Not the owner - check if user has override permission
            if (allowAdminOverride) {
                const ability = this.caslAbilityService.defineAbilityForUser(user);

                if (!ability) {
                    this.logger.warn(`User ${user.id} is not owner and has no override permissions`);
                    throw new ForbiddenException('You can only access your own resources');
                }

                // Check if user can manage this resource type or perform the action
                const method = request.method;
                const action = this.mapMethodToAction(method);

                // Try checking with the resource directly (CASL will evaluate conditions)
                const canAccess = ability.can(action, resource);

                if (canAccess) {
                    this.logger.debug(
                        `User ${user.id} granted override permission for ${action} on resource`
                    );
                    return true;
                }

                this.logger.warn(
                    `User ${user.id} is not owner and failed override permission check`
                );
                throw new ForbiddenException(
                    'You can only access your own resources unless you have override permissions'
                );
            }

            // No override allowed and not the owner
            this.logger.warn(`User ${user.id} is not owner and override not allowed`);
            throw new ForbiddenException('You can only access your own resources');

        } catch (error) {
            if (error instanceof ForbiddenException) {
                throw error;
            }
            this.logger.error(`Error in ResourceOwnerGuard: ${error.message}`, error.stack);
            throw new ForbiddenException('Error checking resource ownership');
        }
    }

    /**
     * Get nested property from object using dot notation
     * e.g., 'account.id' from { account: { id: '123' } } returns '123'
     */
    private getNestedProperty(obj: any, path: string): any {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }

    /**
     * Map HTTP method to CASL action
     */
    private mapMethodToAction(method: string): Action {
        const methodMap: Record<string, Action> = {
            'GET': Action.Read,
            'POST': Action.Create,
            'PATCH': Action.Update,
            'PUT': Action.Update,
            'DELETE': Action.Delete
        };

        return methodMap[method.toUpperCase()] || Action.Read;
    }
}
