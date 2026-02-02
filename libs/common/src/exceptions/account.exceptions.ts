import { Services } from "../enums/services.enum";
import { BaseException, ErrorCode } from "./exceptions";

// In case of error in the role abilities initialization this exception is thrown
export class InitRoleAbilitiesException extends BaseException {
    constructor(message: string) {
        super(Services.App, ErrorCode.InitRoleAbilities, message);
    }
}

export class RemovePermissionException extends BaseException {
    constructor(message: string) {
        super(Services.App, ErrorCode.RemovePermission, message);
    }
}

export class AddPermissionException extends BaseException {
    constructor(message: string) {
        super(Services.App, ErrorCode.AddPermission, message);
    }
}

export class UpdateAccountException extends BaseException {
    constructor(message: string) {
        super(Services.App, ErrorCode.UpdateAccount, message);
    }
}
