/**
 * Acceptable error codes
 */

export type AppErrorCode =
    "GENERAL_ERROR" |
    "COMPILE_ERROR" |
    "CONTEXT_NOT_INITIALIZED" |
    "SEQUENCE_RUN_BEFORE_INIT" |
    "SEQUENCE_ENDED_PREMATURE" |
    "SEQUENCE_MISCONFIGURED";
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
