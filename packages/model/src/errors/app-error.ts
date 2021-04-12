import { AppError as IAppError, AppErrorCode } from "@scramjet/types";

type IAppErrorData = {
    data?: any;
}

export class AppError extends Error implements IAppError, IAppErrorData {
    code: AppErrorCode;
    data?: any;

    constructor(code: AppErrorCode) {
        super("Application Error Occured");

        this.code = code;
    }
}

