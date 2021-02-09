/**
 * Acceptable error codes
 */

export type AppErrorCode =
    "GENERAL_ERROR" |
    "COMPILE_ERROR" |
    "SEQUENCE_MISCONFIGURED";
/**
 * Application error class
 */

export type AppError = Error & {
    code: AppErrorCode;
    exitcode?: number;
};
