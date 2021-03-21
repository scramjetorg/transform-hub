import { AppError as IAppError, AppErrorCode } from "@scramjet/types";

// TODO: We need to sort out interface naming.
export class AppError extends Error implements IAppError {

    code: AppErrorCode;

    constructor(code: AppErrorCode) {
        super("Application Error Occured");
        this.code = code;
    }
}
