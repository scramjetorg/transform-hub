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

/**
 * Constructs an AppError
 *
 * @param code One of the predefined error codes
 * @param message Optional additional explanatory message
 */
export type AppErrorConstructor = new (code: AppErrorCode, message?: string) => AppError;
