import { RunnerExitCode } from "@scramjet/symbols";
import { InstanceStatus } from "@scramjet/types";

export type RunnerExitCodeDef = {
    message: string;
    exitcode: number;
    status: InstanceStatus;
};

// eslint-disable-next-line complexity
export function mapRunnerExitCode(exitcode: number): Promise<RunnerExitCodeDef> {
    switch (exitcode) {
        case RunnerExitCode.INVALID_ENV_VARS:
            return Promise.reject({
                message: "Runner was started with invalid configuration. This is probably a bug in STH.",
                exitcode: RunnerExitCode.INVALID_ENV_VARS,
                status: InstanceStatus.ERRORED
            });
        case RunnerExitCode.PODS_LIMIT_REACHED:
            return Promise.reject({
                message: "Instance limit reached",
                exitcode: RunnerExitCode.PODS_LIMIT_REACHED,
                status: InstanceStatus.ERRORED
            });
        case RunnerExitCode.INVALID_SEQUENCE_PATH:
            return Promise.reject({
                message: "Sequence entrypoint path is invalid. Check `main` field in Sequence package.json",
                exitcode: RunnerExitCode.INVALID_SEQUENCE_PATH,
                status: InstanceStatus.ERRORED
            });
        case RunnerExitCode.SEQUENCE_FAILED_ON_START:
            return Promise.reject({
                message: "Sequence failed on start",
                exitcode: RunnerExitCode.SEQUENCE_FAILED_ON_START,
                status: InstanceStatus.ERRORED
            });
        case RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION:
            return Promise.reject({
                message: "Sequence failed during execution",
                exitcode: RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION,
                status: InstanceStatus.ERRORED
            });
        case RunnerExitCode.SEQUENCE_UNPACK_FAILED:
            return Promise.reject({
                message: "Sequence unpack failed",
                exitcode: RunnerExitCode.SEQUENCE_UNPACK_FAILED,
                status: InstanceStatus.ERRORED
            });
        case RunnerExitCode.KILLED:
            return Promise.resolve({
                message: "Instance killed", exitcode: RunnerExitCode.KILLED, status: InstanceStatus.COMPLETED
            });
        case RunnerExitCode.STOPPED:
            return Promise.resolve({
                message: "Instance stopped", exitcode: RunnerExitCode.STOPPED, status: InstanceStatus.COMPLETED
            });
        case 0:
            return Promise.resolve({ message: "Instance completed", exitcode, status: InstanceStatus.COMPLETED });
        default:
            return Promise.reject({ message: "Runner failed", exitcode, status: InstanceStatus.ERRORED });
    }
}
