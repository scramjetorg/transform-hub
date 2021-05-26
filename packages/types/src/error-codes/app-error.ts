import { HostErrorCode } from "./host-error";
import { RunnerErrorCode } from "./runner-error";
import { SupervisorErrorCode } from "./supervisor-error";

/**
 * Acceptable error codes
 */
export type AppErrorCode =
    "GENERAL_ERROR" |
    "COMPILE_ERROR" |
    "CONTEXT_NOT_INITIALIZED" |
    "SEQUENCE_RUN_BEFORE_INIT" |
    "SEQUENCE_MISCONFIGURED" |
    HostErrorCode |
    SupervisorErrorCode |
    RunnerErrorCode;

/**
 * Application error class
 */
export type AppError = Error & {
    code: AppErrorCode;
    exitcode?: number;
};

/**
 * Constructs an AppError
 *
 * @param code One of the predefined error codes
 * @param message Optional additional explanatory message
 */
export type AppErrorConstructor = new (code: AppErrorCode, message?: string) => AppError;
