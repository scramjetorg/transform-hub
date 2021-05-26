import { RunnerErrorCode } from "@scramjet/types";
import { AppError } from "./app-error";

export type IRunnerErrorData = any;

export class RunnerError extends AppError implements IRunnerErrorData {
    constructor(code: RunnerErrorCode, data?: IRunnerErrorData) {
        super(code);

        this.data = data;
    }
}
