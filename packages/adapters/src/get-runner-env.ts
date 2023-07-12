import path from "path";
import { RunnerEnvConfig, RunnerEnvironmentVariables } from "./types";

/**
 * Genrates the required runner env variables
 *
 * @param conf main parameters
 * @param extra any extra parameters
 * @returns env vars
 */
export function getRunnerEnvVariables({
    sequencePath, instancesServerPort, instancesServerHost, instanceId, pipesPath, paths = "posix", sequenceInfo
}: RunnerEnvConfig, extra: Record<string, string> = {}): RunnerEnvironmentVariables {
    const join = path[paths].join;

    return {
        PATH: process.env.PATH,
        DEVELOPMENT: process.env.DEVELOPMENT,
        PRODUCTION: process.env.PRODUCTION,
        SEQUENCE_PATH: sequencePath,
        INSTANCES_SERVER_PORT: `${instancesServerPort}`,
        INSTANCES_SERVER_HOST: instancesServerHost,
        INSTANCE_ID: instanceId,
        PIPES_LOCATION: pipesPath,
        CRASH_LOG: join(pipesPath, "crash_log"),
        SEQUENCE_INFO: JSON.stringify(sequenceInfo),
        ...extra
    };
}

/**
 * Genrates the required runner env variables as Object.entries
 *
 * @param conf main parameters
 * @param extra any extra parameters
 * @returns env vars as entries
 */
export function getRunnerEnvEntries(conf: RunnerEnvConfig, extra: Record<string, string> = {}) {
    return Object.entries(getRunnerEnvVariables(conf, extra));
}

