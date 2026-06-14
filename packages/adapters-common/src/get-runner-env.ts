import path from "path";
import { STHConfiguration } from "@scramjet/types";
import { RunnerEnvConfig, RunnerEnvironmentVariables } from "./types";

export function getRunnerTransportEnv(
    sthConfig: Pick<STHConfiguration, "verser2">,
    instanceId: string
): Record<string, string> {
    if (!sthConfig.verser2.enabled || sthConfig.verser2.migrationMode !== "verser2") {
        return {};
    }

    return {
        SCRAMJET_RUNNER_TRANSPORT_CONFIG: JSON.stringify({
            kind: "verser2",
            hostUrl: sthConfig.verser2.hostUrl,
            guestId: `runner.${instanceId}.guest`,
            routeDomain: `runner.${instanceId}.scramjet.internal`,
            tls: sthConfig.verser2.tls,
            leaseAcquireTimeoutMs: sthConfig.verser2.timeouts.leaseAcquireMs,
            minWaitingStreams: sthConfig.verser2.leases.minimumWaitingLeases
        })
    };
}

/**
 * Genrates the required runner env variables
 *
 * @param conf main parameters
 * @param extra any extra parameters
 * @returns env vars
 */
export function getRunnerEnvVariables({
    sequencePath, instancesServerPort, instancesServerHost, instanceId, pipesPath, paths = "posix", sequenceInfo, payload
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
        RUNNER_CONNECT_INFO: JSON.stringify(payload),
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
