import { InstanceAdapterErrorCode } from "@scramjet/types";
import { AppError } from "./app-error";

export class InstanceAdapterError extends AppError {
    constructor(code: InstanceAdapterErrorCode, data?: any) {
        super(code);

        this.data = data;
    }
}
