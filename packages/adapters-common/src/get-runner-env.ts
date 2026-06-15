import path from "path";
import { STHConfiguration } from "@scramjet/types";
import { RunnerEnvConfig, RunnerEnvironmentVariables } from "./types";

export function buildRunnerTrustBundle(sthConfig: Pick<STHConfiguration, "verser2">): string | undefined {
    const sthLocalCa = normalizePem(sthConfig.verser2.runnerHost?.ca);

    if (!sthLocalCa) {
        return undefined;
    }

    const managerCa = normalizePem(sthConfig.verser2.tls.ca);
    const bundle = [sthLocalCa, managerCa].filter((pem): pem is string => !!pem);

    return bundle.join("\n");
}

function normalizePem(value: string | undefined): string | undefined {
    if (!value?.trim()) {
        return undefined;
    }

    return value.trim();
}

export function getRunnerTransportEnv(
    sthConfig: Pick<STHConfiguration, "verser2">,
    instanceId: string
): Record<string, string> {
    const runnerHost = sthConfig.verser2.runnerHost;
    const trustBundle = buildRunnerTrustBundle(sthConfig);

    if (
        !sthConfig.verser2.enabled ||
        sthConfig.verser2.migrationMode !== "verser2" ||
        !runnerHost?.enabled ||
        !runnerHost.host.publicUrl.trim() ||
        !trustBundle
    ) {
        return { SCRAMJET_RUNNER_TRANSPORT_CONFIG: JSON.stringify({ kind: "legacy" }) };
    }

    return {
        SCRAMJET_RUNNER_TRANSPORT_CONFIG: JSON.stringify({
            kind: "verser2",
            hostUrl: runnerHost.host.publicUrl,
            routeDomain: `runner.${instanceId}.scramjet.internal`,
            guestId: `runner.${instanceId}.guest`,
            hubBrokerId: `runner.${instanceId}.hub.broker`,
            hubTargetDomain: sthConfig.verser2.guest.routeDomain,
            leaseAcquireTimeoutMs: sthConfig.verser2.timeouts.leaseAcquireMs,
            minWaitingStreams: sthConfig.verser2.leases.minimumWaitingLeases,
            tls: { ca: trustBundle }
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
