import { HttpException, HttpStatus } from "@nestjs/common";
import { Services } from "../enums/services.enum";

export enum ErrorCode {
    AddPermission,
    RemovePermission,
    OwnerNotFound,
    CreateOrder,
    UpdateOrder,
    CreateTransaction,
    InitRoleAbilities,
    UpdateAccount,
    CartNotFound
}

export class BaseException extends HttpException {
    constructor(domain: Services,
        ec: ErrorCode,
        message: string) {
        super(`[${domain}:${ec}] : ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
