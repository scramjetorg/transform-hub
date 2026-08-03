import { CSIControllerErrorCode } from "./csi-controller-error";
import { HostErrorCode } from "./host-error";
import { RunnerErrorCode } from "./runner-error";
import { InstanceAdapterErrorCode } from "./instance-adapter-error";
import { SequenceAdapterErrorCode } from "./sequence-adapter-error";

/**
 * Acceptable error codes.
 */
export type AppErrorCode =
    "GENERAL_ERROR" |
    "COMPILE_ERROR" |
    "CONTEXT_NOT_INITIALIZED" |
    "SEQUENCE_RUN_BEFORE_INIT" |
    "SEQUENCE_MISCONFIGURED" |
    CSIControllerErrorCode |
    HostErrorCode |
    InstanceAdapterErrorCode |
    SequenceAdapterErrorCode |
    RunnerErrorCode;

/**
 * Application error type.
 */
export type AppError = Error & {
    code: AppErrorCode;
    exitcode?: number;
};

/**
 * Constructs an AppError.
 */
export type AppErrorConstructor = new (code: AppErrorCode, message?: string) => AppError;
