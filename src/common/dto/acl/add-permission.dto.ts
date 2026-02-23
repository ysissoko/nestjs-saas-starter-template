import { PermissionDTO } from "./permission.dto"

export interface AddPermissionDTO {
    roleId: string
    permission: PermissionDTO
}
