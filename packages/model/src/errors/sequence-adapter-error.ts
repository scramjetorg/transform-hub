import { SequenceAdapterErrorCode } from "@scramjet/types";
import { AppError } from "./app-error";

export class SequenceAdapterError extends AppError {
    constructor(code: SequenceAdapterErrorCode, data?: any) {
        super(code);

        this.data = data;
    }
}
