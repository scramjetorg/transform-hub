import { AppError as IAppError, AppErrorCode } from "@scramjet/runtime-types";

type IAppErrorData = {
    data?: any;
}

export class AppError extends Error implements IAppError, IAppErrorData {
    code: AppErrorCode;
    data?: any;

    constructor(code: AppErrorCode) {
        super("Application Error Occurred");

        this.code = code;
    }
}

