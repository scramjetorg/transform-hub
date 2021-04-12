import { HostErrorCode } from "@scramjet/types";
import { AppError } from ".";

export type IHostErrorData = any;

export class HostError extends AppError implements IHostErrorData {
    constructor(code: HostErrorCode, data?: IHostErrorData) {
        super(code);

        this.data = data;
    }
}
