import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ChildProcess } from "node:child_process";
import type { CustomWorld } from "../step-definitions/world";
import type { ScenarioIsolation } from "./scenario-isolation";
import { HostUtils } from "./host-utils";
import { resolveManifestProofArtifacts, type ManifestProofArtifacts, type ManifestProofMode } from "./runtime-manifest-artifacts";

type ManifestHostState = {
    hostUtils: HostUtils;
    child: ChildProcess;
    apiBaseUrl: string;
    configurationPath: string;
    artifacts: ManifestProofArtifacts;
    hostInfoPath: string;
    sequencePath: string;
};

type ManifestWorld = CustomWorld & {
    resources: CustomWorld["resources"] & { runtimeManifestHost?: ManifestHostState };
    scenarioIsolation?: ScenarioIsolation;
};

const workspaceRoot = resolve(__dirname, "../..");

export async function startManifestHost(world: ManifestWorld, mode: ManifestProofMode): Promise<ManifestHostState> {
    if (world.resources.runtimeManifestHost) throw new Error("Runtime-manifest Host is already started for this scenario");
    const isolation = world.scenarioIsolation;
    if (!isolation) throw new Error("ScenarioIsolation must be installed before starting runtime-manifest Host");

    const artifacts = resolveManifestProofArtifacts(mode, { workspaceRoot });
    const { defaultConfig } = require(artifacts.modules.config) as { defaultConfig: Record<string, any> };
    const apiPort = await isolation.reservePort();
    const runnerPort = await isolation.reservePort();
    const hostInfoPath = join(isolation.artifactsDir, "runtime-manifest-host-info.json");
    const sequencePath = join(isolation.artifactsDir, "sequences");
    const identityDir = join(isolation.artifactsDir, "runner-host-identity");
    const configurationPath = join(isolation.artifactsDir, "runtime-manifest-host-config.json");
    const apiBaseUrl = `http://127.0.0.1:${apiPort}/api/v1`;
    const config = {
        ...defaultConfig,
        runtimeAdapter: "process",
        sequencesRoot: sequencePath,
        adapters: {
            ...defaultConfig.adapters,
            process: {
                name: "process",
                instanceRequirements: defaultConfig.instanceRequirements,
                safeOperationLimit: defaultConfig.safeOperationLimit,
                sequencesRoot: sequencePath
            }
        },
        killOnExit: true,
        exitWithLastInstance: false,
        host: { ...defaultConfig.host, port: apiPort, instancesServerPort: await isolation.reservePort(), hostname: "127.0.0.1", infoFilePath: hostInfoPath },
        verser2: {
            ...defaultConfig.verser2,
            enabled: true,
            hostUrl: `https://127.0.0.1:${runnerPort}`,
            runnerHost: {
                ...defaultConfig.verser2.runnerHost,
                enabled: true,
                identityDir,
                host: {
                    ...defaultConfig.verser2.runnerHost.host,
                    bindHost: "127.0.0.1",
                    bindPort: runnerPort,
                    publicUrl: `https://127.0.0.1:${runnerPort}`,
                    tls: { ...defaultConfig.verser2.runnerHost.host.tls, mtlsRequired: false }
                }
            },
            controlIngress: { ...defaultConfig.verser2.controlIngress, enabled: false }
        },
        telemetry: { ...defaultConfig.telemetry, status: false }
    };
    writeFileSync(configurationPath, JSON.stringify(config, null, 2), { mode: 0o600 });
    const hostUtils = new HostUtils({
        executableCommand: artifacts.hostCommand as [string, ...string[]],
        environment: isolation.environment({ SCRAMJET_CONFIG: configurationPath, SCRAMJET_CONFIG_PATH: configurationPath, NO_HOST: "false" }),
        ...(mode === "source" ? { cwd: artifacts.workspaceRoot } : {})
    });
    hostUtils.hostUrl = "";
    const startup = hostUtils.spawnHost(["port", "instances-server-port", "cpm-url", "runtime-adapter", "instance-lifetime-extension-delay"], "--config", configurationPath);
    const child = hostUtils.host;
    if (!child) throw new Error("HostUtils did not synchronously create the scenario-owned Host process");
    const state: ManifestHostState = { hostUtils, child, apiBaseUrl, configurationPath, artifacts, hostInfoPath, sequencePath };
    world.resources.runtimeManifestHost = state;
    isolation.ownChild(child, "runtime-manifest-host", { group: true, onStop: () => hostUtils.markStopExpected() });

    const startupFailure = new Promise<never>((_, reject) => {
        child.once("error", reject);
        child.once("exit", (code, signal) => reject(new Error(`Runtime-manifest Host exited before readiness (code=${code}, signal=${signal}); stdout=${hostUtils.stdoutTail}; stderr=${hostUtils.stderrTail}`)));
    });
    await Promise.race([startup, startupFailure]);
    if (child.exitCode !== null) throw new Error(`Runtime-manifest Host exited during startup (code=${child.exitCode}); stderr=${hostUtils.stderrTail}`);
    world.scenarioLifecycle.ready(child);
    return state;
}

export async function closeManifestHost(world: ManifestWorld): Promise<void> {
    const state = world.resources.runtimeManifestHost;
    if (!state) return;
    state.hostUtils.markStopExpected();
    try {
        await world.scenarioLifecycle.stop(state.child);
    } finally {
        state.hostUtils.output = "";
        state.hostUtils.stdoutTail = "";
        state.hostUtils.stderrTail = "";
        world.resources.runtimeManifestHost = undefined;
    }
}

export function readManifestHostConfig(state: ManifestHostState): Record<string, any> {
    if (!existsSync(state.configurationPath)) throw new Error(`Runtime-manifest Host config missing: ${state.configurationPath}`);
    return JSON.parse(readFileSync(state.configurationPath, "utf8"));
}
