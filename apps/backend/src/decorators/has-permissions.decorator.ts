import { SetMetadata } from '@nestjs/common';
import { Action, Subject } from '@common';

export interface PermissionMetadata {
    action: Action;
    subject?: Subject;
    field?: string;
    checkResource?: boolean; // Whether to check resource-level conditions
}

export const HasPermissions = (metadata: PermissionMetadata) => {
    return SetMetadata('permissions', metadata);
};

// Alias for backwards compatibility and clarity
export const CheckPolicies = HasPermissions;
