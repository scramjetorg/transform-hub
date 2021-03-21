import { AppError as IAppError, AppErrorCode } from "@scramjet/types";

export class AppError extends Error implements IAppError {

    code: AppErrorCode;

    constructor(code: AppErrorCode) {
        super("Application Error Occured");
        this.code = code;
    }
}
