import { SetMetadata } from '@nestjs/common';
import { ResourceOwnerMetadata } from '../guards/resource-owner.guard';

/**
 * Decorator to check if the user owns the resource they're trying to access.
 *
 * Usage:
 * @CheckResourceOwner({
 *   resourceGetter: async (req) => await this.service.findById(req.params.id),
 *   ownerField: 'account.id', // or 'userId', 'createdBy.id', etc.
 *   allowAdminOverride: true // default: true
 * })
 *
 * Must be used in conjunction with ResourceOwnerGuard:
 * @UseGuards(JwtAuthGuard, HasPermissionsGuard, ResourceOwnerGuard)
 */
export const CheckResourceOwner = (metadata: ResourceOwnerMetadata) =>
    SetMetadata('resourceOwner', metadata);
