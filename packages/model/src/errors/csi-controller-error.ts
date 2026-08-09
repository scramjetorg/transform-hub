import { CSIControllerErrorCode } from "@scramjet/runtime-types";
import { AppError } from "./app-error";

export type ICSIControllerErrorData = any;

export class CSIControllerError extends AppError implements ICSIControllerErrorData {
    constructor(code: CSIControllerErrorCode, data?: ICSIControllerErrorData) {
        super(code);

        this.data = data;
    }
}
