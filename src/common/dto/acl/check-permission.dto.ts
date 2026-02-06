import { ID } from "@common/entity/base.entity";
import { Action, Subject } from '../../enums/acl';

export interface CheckPermissionDTO {
    userId: ID;
    action: Action | string;
    subject: Subject | string;
    field?: string;
}

export interface CheckResourcePermissionDTO extends CheckPermissionDTO {
    resource: any; // The actual resource object to check conditions against
}
