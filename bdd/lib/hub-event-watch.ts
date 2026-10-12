import { strict as assert } from "node:assert";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { cpSync, createReadStream, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import type { HostClient as HostClientType, InstanceClient, ManagerClient } from "@scramjet/api-client";
import type { MultiManagerClient } from "@scramjet/multi-manager-api-client";
import type { ClientUtils as ClientUtilsType } from "@scramjet/client-utils";
import type { ManagerConfiguration } from "@scramjet/api-types";
import type { CustomWorld } from "../step-definitions/world";
import { resolveFixturePackagePath } from "./fixture-package-path.js";
import { resolveManifestProofArtifacts, type ManifestProofArtifacts } from "./runtime-manifest-artifacts";
import type { HostUtils } from "./host-utils";
import type { ScenarioIsolation, MtlsControlIngress } from "./scenario-isolation";
import { readManifestHostConfig, startManifestHost } from "./runtime-manifest-host";
import { HubEventWatchH2Relay, type HubWatchRelaySelection } from "./hub-event-watch-relay";
import { resolvePublishedBin, resolvePublishedModule } from "./published-artifacts";

type WatchKind = "sequence" | "instance" | "topic" | "health";

/** Small real-HTTP smoke helper; all requests are made through the public client. */
export async function verifyHubWatchSnapshots(apiBaseUrl: string, restApi2Path: string): Promise<Record<WatchKind, unknown>> {
    const { createHubClient, createHttpClientTransport } = require(restApi2Path) as typeof import("@scramjet/rest-api2");
    const transport = createHttpClientTransport({ baseUrl: new URL(apiBaseUrl).origin, fetch });
    const client = createHubClient({ transport, basePath: "/api/v2" });
    const snapshots = {} as Record<WatchKind, unknown>;
    try {
        for (const kind of ["sequence", "instance", "topic", "health"] as const) {
            const watch = client.events.watch(kind);
            try {
                const first = await watch.next();
                assert.equal(first.done, false, `${kind} watch ended before its snapshot`);
                assert.equal(first.value.type, "snapshot", `${kind} watch did not begin with a snapshot`);
                assert.equal(first.value.kind, kind, `${kind} watch returned the wrong snapshot kind`);
                assert.ok(first.value.cursor.hubId && first.value.cursor.epoch, `${kind} snapshot omitted its real Hub cursor identity`);
                snapshots[kind] = first.value;
            } finally {
                await watch.close();
            }
        }
        return snapshots;
    } finally { /* Closing each watch owns and releases its HTTP response resources. */ }
}

type WatchHostState = {
    apiBaseUrl: string;
    artifacts: ManifestProofArtifacts;
    hostUtils: HostUtils;
    child: ChildProcess;
    configurationPath: string;
    hostInfoPath: string;
    sequencePath: string;
};
type WatchWorld = CustomWorld & { resources: CustomWorld["resources"] & { runtimeManifestHost?: WatchHostState } };
type WatchEvent = { type: string; kind: string; cursor: { hubId: string; epoch: string; position: number }; items?: unknown[] };

type CleanupResult = { outcome: string; acquiredId: string; releasedId: string; controlUpsert: boolean; controlRemove: boolean; statusCode: number };

type HostedRelayResources = {
    runId: string;
    relay?: HubEventWatchH2Relay;
    tls?: ReturnType<NonNullable<CustomWorld["scenarioIsolation"]>["createVerser2TlsCredentials"]>;
    targetId?: string;
    routeDomain?: string;
    cleanup: () => Promise<void>;
    cleanupEvidence?: Record<string, unknown>;
    result?: Record<string, any>;
};

type HostedCpmResources = {
    runId: string;
    mmId: string;
    managerId: string;
    hubId: string;
    managerDomain: string;
    hubDomain: string;
    mmApiPort?: number;
    mmVerserPort?: number;
    mmApiBase?: string;
    mmVerserUrl?: string;
    mmBinPath?: string;
    tls?: ReturnType<ScenarioIsolation["createVerser2TlsCredentials"]>;
    managerConfig?: ManagerConfiguration;
    managerStoragePath?: string;
    managerTrust?: { ca: string };
    mmProcess?: ChildProcess;
    mmApiReady?: boolean;
    managerStartRequested?: boolean;
    mmClient?: MultiManagerClient;
    mmApiUtils?: ClientUtilsType;
    clientUtilsModulePath?: string;
    managerClient?: ManagerClient;
    cleanup: () => Promise<void>;
    cleanupEvidence?: Record<string, unknown>;
    result?: Record<string, any>;
};

function withinDeadline<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    return Promise.race([
        operation,
        new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs}ms`)), timeoutMs); })
    ]).finally(() => { if (timer) clearTimeout(timer); });
}

async function waitForCpmManagerList(cpm: HostedCpmResources, shouldExist: boolean, timeoutMs = 15_000): Promise<boolean> {
    assert.ok(cpm.mmClient, "MultiManager API client must be initialized");
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const managers = await withinDeadline(cpm.mmClient.getManagers(), 3_000, "MultiManager manager list");
        const exists = Array.isArray(managers) && managers.some(manager => manager.id === cpm.managerId);
        if (exists === shouldExist) return true;
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    return false;
}

async function waitForCpmManagerReady(cpm: HostedCpmResources, clientUtils: ClientUtilsType): Promise<{ managerVersion: unknown; trust: { ca: string } }> {
    assert.ok(cpm.mmClient && cpm.managerClient);
    const deadline = Date.now() + 15_000;
    let managerVersion: unknown;
    let trust: { ca: string } | undefined;
    let diagnostic: Record<string, unknown> = {};
    while (Date.now() < deadline) {
        let managerVersionReady = false;
        let managerListed = false;
        let trustReady = false;
        try { managerVersion = await withinDeadline(cpm.managerClient.getVersion(), 3_000, "embedded Manager version"); managerVersionReady = true; }
        catch (error) { diagnostic.managerVersionError = safeSetupError(error); }
        try {
            const managerList = await withinDeadline(cpm.mmClient.getManagers(), 3_000, "MultiManager manager list");
            managerListed = Array.isArray(managerList) && managerList.some(manager => manager.id === cpm.managerId);
        } catch (error) { diagnostic.managerListError = safeSetupError(error); }
        try {
            const trustResponse = await withinDeadline(clientUtils.get<{ ca?: string }>(`verser2/trust/${cpm.managerId}`), 3_000, "MultiManager Verser2 trust");
            trustReady = typeof trustResponse?.ca === "string" && trustResponse.ca.length > 0;
            if (trustReady) trust = { ca: trustResponse.ca! };
            else diagnostic.trustResponseKeys = trustResponse && typeof trustResponse === "object" ? Object.keys(trustResponse) : [];
        } catch (error) { diagnostic.trustError = safeSetupError(error); }
        diagnostic = { managerVersionReady, managerListed, trustReady, ...diagnostic };
        if (managerVersionReady && managerListed && trustReady && trust) return { managerVersion, trust };
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Embedded Manager ${cpm.managerId} did not become registered/ready with retrievable trust before the setup deadline; safe diagnostics=${JSON.stringify(diagnostic)}`);
}

function safeSetupError(value: unknown): { name: string; code?: string; status?: number; reasonStatus?: number; trustFailureClass?: string } {
    const error = value as { name?: unknown; code?: unknown; status?: unknown; message?: unknown; reason?: { status?: unknown; body?: unknown; message?: unknown } } | null;
    const body = error?.reason?.body;
    const bodyText = typeof body === "string" ? body : body && typeof body === "object" ? JSON.stringify(body) : "";
    const reasonText = `${typeof error?.message === "string" ? error.message : ""} ${typeof error?.reason?.message === "string" ? error.reason.message : ""} ${bodyText}`;
    const trustFailureClass = /requires host\.tls\.caFile/i.test(reasonText) ? "host-ca-file-missing"
        : /requires certificate PEM material/i.test(reasonText) ? "ca-file-has-no-certificate"
        : /refuses non-certificate PEM material/i.test(reasonText) ? "ca-file-contains-non-certificate"
        : /Manager .* not found/i.test(reasonText) ? "manager-not-registered"
        : /ENOENT|file not found/i.test(reasonText) ? "trust-file-not-found"
        : undefined;
    return {
        name: typeof error?.name === "string" ? error.name : "Error",
        ...(typeof error?.code === "string" ? { code: error.code } : {}),
        ...(typeof error?.status === "number" ? { status: error.status } : {}),
        ...(typeof error?.reason?.status === "number" ? { reasonStatus: error.reason.status } : {}),
        ...(trustFailureClass ? { trustFailureClass } : {})
    };
}

async function assertCpmPortRebound(port: number): Promise<void> {
    const server = createServer();
    let timer: NodeJS.Timeout | undefined;
    try {
        await Promise.race([
            new Promise<void>((resolve, reject) => {
                server.once("error", reject);
                server.listen(port, "127.0.0.1", () => { server.off("error", reject); resolve(); });
            }),
            new Promise<void>((_, reject) => { timer = setTimeout(() => reject(new Error(`CPM scenario port ${port} did not rebind within 5s`)), 5_000); })
        ]);
    } finally {
        if (timer) clearTimeout(timer);
        if (server.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
}

/** Starts one actual MultiManager with its embedded Manager and configures the real Hub CPM connection. */
export async function startHostedConfiguredCpmHub(world: WatchWorld): Promise<void> {
    const isolation = world.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must own the CPM topology, TLS credentials, and ports");
    const runId = randomUUID();
    const suffix = runId.replace(/-/g, "").slice(0, 18);
    const cpm: HostedCpmResources = {
        runId,
        mmId: `watch-mm-${suffix}`,
        managerId: `watch-manager-${suffix}`,
        hubId: `watch-cpm-hub-${suffix}`,
        managerDomain: `manager.watch-${suffix}.scramjet.internal`,
        hubDomain: `sth.watch-cpm-hub-${suffix}.scramjet.internal`,
        cleanup: async () => {
            const errors: Error[] = [];
            const mmClient = cpm.mmClient;
            let managerStopped = false;
            let portsRebound = true;
            if (mmClient && cpm.mmApiBase && cpm.mmApiReady) {
                try {
                    const managers = await mmClient.getManagers();
                    if (Array.isArray(managers) && managers.some(manager => manager.id === cpm.managerId)) {
                        await mmClient.client.post(`cpm/${cpm.managerId}/stop`, undefined, { headers: { "content-type": "application/json" } });
                        managerStopped = await waitForCpmManagerList(cpm, false, 10_000);
                        if (!managerStopped) throw new Error("Owned embedded Manager remained in MultiManager after cleanup stop");
                    } else {
                        managerStopped = true;
                    }
                } catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
            } else if (!cpm.managerStartRequested) {
                managerStopped = true;
            }
            try { cpm.managerClient?.dispose(); } catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
            try { cpm.mmApiUtils?.dispose(); } catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
            if (cpm.mmProcess) {
                try { await world.scenarioLifecycle.stop(cpm.mmProcess); }
                catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
            }
            const mmProcessStopped = cpm.mmProcess ? cpm.mmProcess.exitCode !== null || cpm.mmProcess.signalCode !== null : true;
            let managerStorageRemoved = cpm.managerStoragePath ? !existsSync(cpm.managerStoragePath) : true;
            if (cpm.managerStoragePath && mmProcessStopped) {
                try {
                    if (dirname(cpm.managerStoragePath) !== resolve(process.cwd()) || !cpm.managerStoragePath.endsWith(cpm.managerId)) {
                        throw new Error("Refusing to remove Manager storage outside this scenario's exact cwd child");
                    }
                    rmSync(cpm.managerStoragePath, { recursive: true, force: true });
                    managerStorageRemoved = !existsSync(cpm.managerStoragePath);
                    if (!managerStorageRemoved) throw new Error("Owned embedded Manager storage directory remains after cleanup");
                } catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
            }
            for (const port of [cpm.mmApiPort, cpm.mmVerserPort]) {
                if (port !== undefined) {
                    try { await assertCpmPortRebound(port); }
                    catch (error) { portsRebound = false; errors.push(error instanceof Error ? error : new Error(String(error))); }
                }
            }
            cpm.cleanupEvidence = {
                managerStopped,
                mmProcessStopped,
                managerStorageRemoved,
                portsRebound: portsRebound && cpm.mmApiPort !== undefined && cpm.mmVerserPort !== undefined
            };
            if (errors.length) throw new Error(`Configured CPM cleanup errors: ${errors.map(error => error.message).join("; ")}`);
        }
    };
    world.resources.hubWatchCpm = cpm;

    const workspaceRoot = resolve(__dirname, "../..");
    const artifacts = resolveManifestProofArtifacts("built", { workspaceRoot });
    const distRoot = realpathSync(join(artifacts.workspaceRoot, "dist"));
    cpm.tls = isolation.createVerser2TlsCredentials();
    cpm.mmApiPort = await isolation.reservePort();
    cpm.mmVerserPort = await isolation.reservePort();
    cpm.mmApiBase = `http://127.0.0.1:${cpm.mmApiPort}/api/v1`;
    cpm.mmVerserUrl = `https://127.0.0.1:${cpm.mmVerserPort}`;

    const mmBin = resolvePublishedBin("@scramjet/multi-manager", "multi-manager", { workspaceRoot: artifacts.workspaceRoot });
    cpm.mmBinPath = realpathSync(mmBin);
    assert.ok(cpm.mmBinPath.startsWith(`${distRoot}${require("node:path").sep}`), `MultiManager bin resolved outside selected dist: ${cpm.mmBinPath}`);
    const mmClientModulePath = realpathSync(resolvePublishedModule("@scramjet/multi-manager-api-client", { workspaceRoot: artifacts.workspaceRoot }));
    const clientUtilsModulePath = realpathSync(resolvePublishedModule("@scramjet/client-utils", { workspaceRoot: artifacts.workspaceRoot }));
    cpm.clientUtilsModulePath = clientUtilsModulePath;
    for (const [name, path] of [["MultiManager API client", mmClientModulePath], ["ClientUtils", clientUtilsModulePath]] as const) {
        assert.ok(path.startsWith(`${distRoot}${require("node:path").sep}`), `${name} resolved outside selected dist: ${path}`);
    }
    const { MultiManagerClient: SelectedMultiManagerClient } = require(mmClientModulePath) as typeof import("@scramjet/multi-manager-api-client");
    const { ClientUtils: SelectedClientUtils } = require(clientUtilsModulePath) as typeof import("@scramjet/client-utils");
    const mmIdentityDir = join(isolation.artifactsDir, "watch-cpm-mm-identity");
    mkdirSync(mmIdentityDir, { recursive: true, mode: 0o700 });
    const mmConfigPath = join(isolation.artifactsDir, `watch-cpm-mm-${suffix}.json`);
    writeFileSync(mmConfigPath, JSON.stringify({
        id: cpm.mmId,
        logLevel: "INFO",
        verser2: {
            enabled: true,
            host: {
                identityDir: mmIdentityDir,
                bindHost: "127.0.0.1",
                bindPort: cpm.mmVerserPort,
                publicUrl: cpm.mmVerserUrl,
                tls: { certFile: cpm.tls.certFile, keyFile: cpm.tls.keyFile, caFile: cpm.tls.caFile, mtlsRequired: false }
            },
            registration: { allowedClientFingerprints: [] },
            controlIngress: { enabled: false }
        }
    }, null, 2), { mode: 0o600 });
    const mmArgs = [
        `--id=${cpm.mmId}`,
        `--server-api-port=${cpm.mmApiPort}`,
        "--host=127.0.0.1",
        `--verser2-host-bind-port=${cpm.mmVerserPort}`,
        "--verser2-host-bind-host=127.0.0.1",
        `--verser2-host-public-url=${cpm.mmVerserUrl}`,
        "--verser2-allow-local-peers=true",
        `--verser2-host-identity-dir=${mmIdentityDir}`,
        `--config=${mmConfigPath}`,
        "--log-level=INFO"
    ];
    const mmProcess = spawn("/usr/bin/env", [cpm.mmBinPath, ...mmArgs], {
        detached: true,
        env: isolation.environment(),
        stdio: ["ignore", "ignore", "ignore"]
    });
    cpm.mmProcess = mmProcess;
    isolation.ownChild(mmProcess, "hub-watch-cpm-multimanager", { group: true });
    const mmApiUtils = cpm.mmApiUtils = new SelectedClientUtils(cpm.mmApiBase);
    cpm.mmClient = new SelectedMultiManagerClient(cpm.mmApiBase, mmApiUtils);
    const apiDeadline = Date.now() + 20_000;
    let mmReady = false;
    while (Date.now() < apiDeadline) {
        if (mmProcess.exitCode !== null) throw new Error(`Selected MultiManager exited before API readiness (code=${mmProcess.exitCode})`);
        try {
            await withinDeadline(cpm.mmClient.getVersion(), 2_000, "MultiManager API version");
            mmReady = true;
            break;
        } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(mmReady, "selected built MultiManager API did not become ready within its setup deadline");
    cpm.mmApiReady = true;

    cpm.managerConfig = {
        id: cpm.managerId,
        verser2: {
            localBroker: { peerId: `manager.${cpm.managerId}.broker`, routeDomain: cpm.managerDomain },
            localGuest: { peerId: `manager.${cpm.managerId}.guest`, routeDomain: cpm.managerDomain }
        }
    };
    cpm.managerStoragePath = resolve(process.cwd(), cpm.managerId);
    assert.ok(!existsSync(cpm.managerStoragePath), `Refusing to use preexisting Manager storage directory ${cpm.managerStoragePath}`);
    cpm.managerStartRequested = true;
    cpm.managerClient = await withinDeadline(cpm.mmClient.startManager(cpm.managerConfig), 15_000, "embedded Manager start request");
    const ready = await waitForCpmManagerReady(cpm, mmApiUtils);
    cpm.managerTrust = ready.trust;
    process.stdout.write(`[hub-event-watch-cpm.setup] ${JSON.stringify({ runId, mmId: cpm.mmId, managerId: cpm.managerId, hubId: cpm.hubId,
        managerDomain: cpm.managerDomain, hubDomain: cpm.hubDomain, mmApiPort: cpm.mmApiPort, mmVerserPort: cpm.mmVerserPort,
        mmBinPath: cpm.mmBinPath, mmApiClientPath: mmClientModulePath, clientUtilsPath: clientUtilsModulePath,
        trustPresent: true, managerVersion: ready.managerVersion })}\n`);

    await startManifestHost(world, "built", (configuration) => {
        const verser2 = configuration.verser2;
        configuration.logLevel = "DEBUG";
        configuration.logColors = false;
        configuration.host = { ...configuration.host, id: cpm.hubId };
        configuration.cpmUrl = cpm.mmApiBase;
        configuration.cpmId = cpm.managerId;
        configuration.strictPlatformConnection = false;
        configuration.verser2 = {
            ...verser2,
            hostUrl: cpm.mmVerserUrl,
            guest: { peerId: `sth.${cpm.hubId}.guest`, routeDomain: cpm.hubDomain },
            broker: { peerId: `sth.${cpm.hubId}.broker`, targetDomain: cpm.managerDomain },
            tls: { ...verser2.tls, ca: ready.trust.ca },
            enrollment: { ...verser2.enrollment }
        };
    });
    const hostState = world.resources.runtimeManifestHost;
    assert.ok(hostState);
    const actualHostConfig = readManifestHostConfig(hostState);
    assert.equal(actualHostConfig.cpmUrl, cpm.mmApiBase);
    assert.equal(actualHostConfig.cpmId, cpm.managerId);
    assert.equal(actualHostConfig.host?.id, cpm.hubId);
    assert.equal(actualHostConfig.strictPlatformConnection, false);
    assert.equal(actualHostConfig.verser2?.hostUrl, cpm.mmVerserUrl);
    assert.equal(actualHostConfig.verser2?.guest?.routeDomain, cpm.hubDomain);
    assert.equal(actualHostConfig.verser2?.broker?.targetDomain, cpm.managerDomain);
    assert.equal(actualHostConfig.verser2?.tls?.ca, cpm.managerTrust?.ca);
    assert.ok(!actualHostConfig.startupConfig, "CPM-only health setup must not declare required startup entries");
    process.stdout.write(`[hub-event-watch-cpm.host-config] ${JSON.stringify({ cpmUrl: cpm.mmApiBase, cpmId: cpm.managerId, hubId: cpm.hubId,
        strictPlatformConnection: actualHostConfig.strictPlatformConnection, hostUrl: cpm.mmVerserUrl,
        brokerTargetDomain: cpm.managerDomain, guestRouteDomain: cpm.hubDomain, trustConfigured: Boolean(actualHostConfig.verser2.tls.ca),
        requiredStartupEntries: 0 })}\n`);
    const { HostClient: SelectedHostClient } = require(hostState.artifacts.modules.apiClient) as { HostClient: typeof HostClientType };
    const hostClient = new SelectedHostClient(hostState.apiBaseUrl);
    const connectedDeadline = Date.now() + 20_000;
    let initialHostStatus: any;
    while (Date.now() < connectedDeadline) {
        try {
            initialHostStatus = await hostClient.getStatus();
            if (initialHostStatus.cpm?.cpmId === cpm.managerId && initialHostStatus.cpm?.connected === true) break;
        } catch { /* readiness poll waits for the Host API and the real CPM registration */ }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (initialHostStatus?.cpm?.cpmId !== cpm.managerId || initialHostStatus?.cpm?.connected !== true) {
        const output = `${hostState.hostUtils.output}\n${hostState.hostUtils.stderrTail}`;
        const failedConnectionContext = output.slice(Math.max(0, output.lastIndexOf("Can not connect to Manager")), Math.max(0, output.lastIndexOf("Can not connect to Manager")) + 2_048);
        const evidence = {
            hostCpmIdMatches: initialHostStatus?.cpm?.cpmId === cpm.managerId,
            hostCpmConnected: initialHostStatus?.cpm?.connected === true,
            hubConnectedLogCount: output.split(`Hub ${cpm.hubId} connected to ${cpm.managerId}`).length - 1,
            failedConnectLogCount: output.split("Can not connect to Manager").length - 1,
            tlsFailureObserved: /certificate|unknown ca|self.signed|CERT_[A-Z0-9_]+|ERR_TLS_/i.test(output),
            routeFailureObserved: /missing-guest|no route|route not found/i.test(output),
            socketRefusedObserved: /ECONNREFUSED|ENOTFOUND|EHOSTUNREACH/i.test(output),
            registrationFailureStatuses: [...new Set([...output.matchAll(/Manager STH registration failed:\s*(\d{3})/g)].map(match => Number(match[1])))],
            verserFailureCodes: [...new Set([...failedConnectionContext.matchAll(/\[([a-z][a-z0-9]*(?:-[a-z0-9]+)+)\]/g)].map(match => match[1]))],
            nodeFailureCodes: [...new Set([...failedConnectionContext.matchAll(/\b(ERR_[A-Z0-9_]+|ECONN[A-Z0-9_]+|ENOTFOUND|EHOSTUNREACH)\b/g)].map(match => match[1]))],
            reconnectLogCount: output.split("Connection lost, retrying").length - 1,
            cpmCloseLogCount: output.split("CPM connection closed.").length - 1,
            mmRegistered: (await cpm.mmClient.getManagers()).some(manager => manager.id === cpm.managerId)
        };
        assert.fail(`Host did not reach actual connected CPM status before observer start; safe boundary evidence=${JSON.stringify(evidence)}`);
    }
    await waitForManagerConnectionLog(hostState.hostUtils, cpm.hubId, cpm.managerId, 1, 10_000);
    hostClient.dispose();
}

async function waitForManagerConnectionLog(host: HostUtils, hubId: string, managerId: string, count: number, timeoutMs: number): Promise<void> {
    const expected = `Hub ${hubId} connected to ${managerId}`;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const matches = host.output.split(expected).length - 1;
        if (matches >= count) return;
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.fail(`Timed out waiting for ${count} actual Host->Manager connection log event(s) for ${hubId}/${managerId}`);
}

async function waitForHostLog(host: HostUtils, marker: string, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (host.output.includes(marker)) return;
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.fail(`Timed out waiting for expected Host-owned lifecycle event: ${marker}`);
}

/** Observes actual configured CPM loss and reconnect through one hosted health watch. */
export async function proveHostedConfiguredCpmHealthCycle(world: WatchWorld): Promise<Record<string, any>> {
    const cpm = world.resources.hubWatchCpm as HostedCpmResources;
    assert.ok(cpm?.mmClient && cpm.managerClient && cpm.managerConfig && cpm.managerTrust);
    const state = world.resources.runtimeManifestHost;
    assert.ok(state, "the CPM-configured Hub must be running");
    const runId = cpm.runId;
    const { HostClient } = require(state.artifacts.modules.apiClient) as { HostClient: typeof HostClientType };
    const host = new HostClient(state.apiBaseUrl);
    let observer: InstanceClient | undefined;
    let observerSequenceId: string | undefined;
    const event = async <T>(name: string, send: () => Promise<unknown>): Promise<T> => {
        const pending = observer!.getEvent(name);
        await send();
        return eventData<T>(await pending);
    };
    const command = (body: Record<string, unknown>) => observer!.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: randomUUID(), ...body }));
    const ack = async (watchId: string): Promise<Record<string, any>> => {
        const commandId = randomUUID();
        return event(`hub-watch-ack-${commandId}`, () => command({ action: "ack", read: false, watchId, commandId }));
    };
    const waitFor = async (
        watchId: string,
        predicate: (record: Record<string, any>, response: Record<string, any>) => boolean,
        timeoutMs = 20_000
    ) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const response = await ack(watchId);
            const found = (response.history || []).find((record: Record<string, any>) => record.watchId === watchId && predicate(record, response));
            if (found) return { record: found, acknowledgement: response };
            const unexpectedTerminal = (response.history || []).find((record: any) => record.watchId === watchId && record.type === "error");
            if (unexpectedTerminal) assert.fail(`Health watch terminated before its expected domain-health transition: ${JSON.stringify(unexpectedTerminal.error)}`);
            await new Promise(resolve => setTimeout(resolve, 40));
        }
        assert.fail(`Timed out waiting for actual CPM health timeline on ${watchId}`);
    };

    try {
        const archive = resolveFixturePackagePath("data/sequences/bdd-packages/hub-event-watch-observer.tar.gz");
        const uploadedObserver = await host.sendSequence(createReadStream(archive));
        observerSequenceId = uploadedObserver.id;
        observer = await uploadedObserver.start({ appConfig: { runId }, args: [] });
        const ready = eventData<{ runId: string; provenance: Record<string, any> }>(await observer.getEvent("hub-watch-observer-ready"));
        assert.equal(ready.runId, runId);
        assert.equal(ready.provenance.runtime?.name, "node");
        const selectedDist = realpathSync(join(state.artifacts.workspaceRoot, "dist"));
        for (const name of ["runner-node", "rest-api2", "api-router"] as const) {
            const selected = ready.provenance.productModulePaths?.[name];
            assert.ok(selected, `hosted CPM observer omitted selected ${name} artifact provenance`);
            assert.ok(realpathSync(selected).startsWith(`${selectedDist}${require("node:path").sep}`), `${name} resolved outside selected dist: ${selected}`);
        }

        const watchId = `${runId}-configured-cpm-health`;
        const openCommandId = randomUUID();
        const hostLogBaseline = state.hostUtils.output;
        const serverLogBaseline = new Set(watchLogRecords(hostLogBaseline).map(item => item.watchId));
        await command({ action: "open", kind: "health", watchId, consume: true, commandId: openCommandId });
        const snapshotRecord = await waitFor(watchId, record => record.type === "snapshot" && record.commandId === openCommandId);
        const initialEvent = snapshotRecord.record.event;
        assert.equal(initialEvent.type, "snapshot");
        assert.equal(initialEvent.kind, "health");
        assert.equal(initialEvent.items.length, 1);
        const initial = initialEvent.items[0];
        assert.equal(initial.healthy, true);
        assert.equal(initial.status, "healthy");
        assert.equal(initial.lifecycle, "running");
        assert.equal(initial.startupReady, true);
        assert.deepEqual(initial.cpm, { configured: true, connected: true });
        assert.deepEqual(initial.required, [], "this CPM-only scenario must have no required startup declarations");
        const initialCursor = initialEvent.cursor;
        const watchServerId = await waitForWatchLog(state.hostUtils, serverLogBaseline, "health", "acquired");
        const pendingDisconnectCommandId = randomUUID();
        await command({ action: "pending-read", watchId, commandId: pendingDisconnectCommandId });
        const pendingDisconnect = await waitFor(watchId, (record, response) => record.type === "pending-ready" &&
            record.commandId === pendingDisconnectCommandId && response.hasPendingRead === true);
        assert.equal(pendingDisconnect.acknowledgement.connectionHealth?.state, "live");

        const managersBeforeStop = await cpm.mmClient.getManagers();
        assert.ok(managersBeforeStop.some(manager => manager.id === cpm.managerId), "actual Manager must be registered before the disconnect operation");
        await cpm.mmClient.client.post(`cpm/${cpm.managerId}/stop`, undefined, { headers: { "content-type": "application/json" } });
        const managerStopObserved = await waitForCpmManagerList(cpm, false, 15_000);
        assert.ok(managerStopObserved, "MultiManager list must exclude the stopped Manager before waiting for Hub degradation");
        const disconnectedRecord = await waitFor(watchId, record => record.type === "change" && record.event?.kind === "health" &&
            record.event?.action === "upsert" && record.event?.value?.cpm?.configured === true && record.event?.value?.cpm?.connected === false, 20_000);
        const disconnectedEvent = disconnectedRecord.record.event;
        const disconnected = disconnectedEvent.value;
        assert.equal(disconnectedEvent.previousCursor?.position, initialCursor.position, "disconnected change must link from the actual initial health snapshot");
        assert.ok(disconnectedEvent.cursor.position > initialCursor.position);
        assert.equal(disconnected.healthy, false);
        assert.equal(disconnected.status, "degraded");
        assert.equal(disconnected.lifecycle, "running");
        assert.equal(disconnected.startupReady, true);
        assert.deepEqual(disconnected.required, []);
        await waitForHostLog(state.hostUtils, "CPM connection closed.", 10_000);

        const pendingRecoveryCommandId = randomUUID();
        await command({ action: "pending-read", watchId, commandId: pendingRecoveryCommandId });
        await waitFor(watchId, (record, response) => record.type === "pending-ready" &&
            record.commandId === pendingRecoveryCommandId && response.hasPendingRead === true);
        const oldManagerClient = cpm.managerClient;
        oldManagerClient.dispose();
        cpm.managerClient = undefined;

        // Reuse the exact config and Manager id; CPMConnector retains its existing backoff/reconnect policy.
        cpm.managerClient = await withinDeadline(cpm.mmClient.startManager(cpm.managerConfig), 15_000, "same-id embedded Manager restart");
        const restartedManager = await waitForCpmManagerReady(cpm, cpm.mmApiUtils!);
        cpm.managerTrust = restartedManager.trust;
        const restartedManagerListed = await waitForCpmManagerList(cpm, true, 15_000);
        assert.ok(restartedManagerListed);

        await waitForManagerConnectionLog(state.hostUtils, cpm.hubId, cpm.managerId, 2, 25_000);
        const recoveredRecord = await waitFor(watchId, record => record.type === "change" && record.event?.kind === "health" &&
            record.event?.action === "upsert" && record.event?.value?.cpm?.configured === true && record.event?.value?.cpm?.connected === true, 25_000);
        const recoveredEvent = recoveredRecord.record.event;
        const recovered = recoveredEvent.value;
        assert.equal(recoveredEvent.previousCursor?.position, disconnectedEvent.cursor.position, "recovery change must link directly from the observed disconnected health frame");
        assert.ok(recoveredEvent.cursor.position > disconnectedEvent.cursor.position);
        assert.equal(recoveredEvent.cursor.hubId, initialCursor.hubId);
        assert.equal(recoveredEvent.cursor.epoch, initialCursor.epoch);
        assert.equal(recovered.healthy, true);
        assert.equal(recovered.status, "healthy");
        assert.equal(recovered.lifecycle, "running");
        assert.equal(recovered.startupReady, true);
        assert.deepEqual(recovered.required, []);
        const hostStatusAfterRecovery = await host.getStatus();
        assert.equal(hostStatusAfterRecovery.cpm.cpmId, cpm.managerId);
        assert.equal(hostStatusAfterRecovery.cpm.connected, true);
        const probeId = randomUUID();
        const probe = await event<{ status: number }>(`hub-watch-probe-${probeId}`, () => command({ action: "probe", commandId: probeId }));
        assert.equal(probe.status, 200, "the same hosted Node Agent remains usable through CPM stop/restart");

        const closeCommandId = randomUUID();
        await command({ action: "close", watchId, commandId: closeCommandId });
        const closed = await waitFor(watchId, record => record.type === "closed" && record.commandId === closeCommandId);
        assert.equal(closed.record.actualState, "closed");
        await waitForWatchLog(state.hostUtils, serverLogBaseline, "health", "released", watchServerId);
        const finishId = randomUUID();
        await event("hub-watch-finished", () => command({ action: "finish", commandId: finishId }));
        try { await observer.stop(1_000, false); } catch { /* normal main completion may precede a stop request */ }
        const observerExitDeadline = Date.now() + 10_000;
        let observerExitConfirmed = false;
        while (Date.now() < observerExitDeadline) {
            if ((await host.getInstanceInfo(observer.id)).ended) { observerExitConfirmed = true; break; }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        assert.ok(observerExitConfirmed, "CPM health observer must finish and report an actual ended timestamp");
        observer = undefined;
        try { await host.deleteSequence(observerSequenceId); } catch { /* scenario isolation owns the residual uploaded sequence */ }
        observerSequenceId = undefined;
        host.dispose();

        const output = state.hostUtils.output;
        const cpmClosedLogCount = output.split("CPM connection closed.").length - 1;
        const connectedLogCount = output.split(`Hub ${cpm.hubId} connected to ${cpm.managerId}`).length - 1;
        assert.ok(cpmClosedLogCount >= 1, "Host must emit its actual CPM communication-close event");
        assert.ok(connectedLogCount >= 2, "Host must emit actual initial and recovered Manager communication events");
        const result = {
            runId, mmId: cpm.mmId, managerId: cpm.managerId, hubId: cpm.hubId,
            initial: { health: initial, cursor: initialCursor, observerReceiptMonotonicMs: snapshotRecord.record.clientReceiptMonotonicMs },
            disconnected: { health: disconnected, cursor: disconnectedEvent.cursor, previousCursor: disconnectedEvent.previousCursor,
                observerReceiptMonotonicMs: disconnectedRecord.record.clientReceiptMonotonicMs },
            recovered: { health: recovered, cursor: recoveredEvent.cursor, previousCursor: recoveredEvent.previousCursor,
                observerReceiptMonotonicMs: recoveredRecord.record.clientReceiptMonotonicMs },
            managerStopObserved, managerRestartObserved: restartedManagerListed, cpmClosedLogCount, realConnectedLogCount: connectedLogCount,
            serverAcquiredId: watchServerId, serverReleasedId: watchServerId, probeStatus: probe.status, observerExitConfirmed,
            managerVersion: restartedManager.managerVersion, observer: ready.provenance
        };
        cpm.result = result;
        process.stdout.write(`[hub-event-watch-cpm.health-cycle] ${JSON.stringify(result)}\n`);
        return result;
    } finally {
        if (observer) {
            try { await command({ action: "finish", commandId: randomUUID() }); } catch { /* preserve the primary assertion */ }
            try { await observer.stop(1_000, false); } catch { /* Host teardown remains available */ }
        }
        if (observerSequenceId) { try { await host.deleteSequence(observerSequenceId); } catch { /* scenario isolation retains uploaded sequence ownership */ } }
        host.dispose();
    }
}

/** Starts the actual Host with its runner Host advertised through the private routed H2 relay. */
export async function startHostedHealthyIdleRelay(world: WatchWorld): Promise<void> {
    const isolation = world.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must own relay TLS material and port");
    const relayResources: HostedRelayResources = {
        runId: randomUUID(),
        cleanup: async () => {
            if (!relayResources.relay) return;
            const beforeClose = relayResources.relay.snapshot();
            const port = relayResources.relay.listenPort;
            await relayResources.relay.close();
            const afterClose = relayResources.relay.snapshot();
            assert.equal(afterClose.sessionPairs, 0, "relay must have no session mappings after owned cleanup");
            assert.equal(afterClose.activeStreams, 0, "relay must have no active stream mappings after owned cleanup");
            const rebind = createServer();
            let rebindTimer: NodeJS.Timeout | undefined;
            try {
                await Promise.race([
                    new Promise<void>((resolve, reject) => {
                        rebind.once("error", reject);
                        rebind.listen(port, "127.0.0.1", () => { rebind.off("error", reject); resolve(); });
                    }),
                    new Promise<void>((_, reject) => { rebindTimer = setTimeout(() => reject(new Error("relay port did not rebind within 5s")), 5_000); })
                ]);
            } finally {
                if (rebindTimer) clearTimeout(rebindTimer);
                if (rebind.listening) await new Promise<void>((resolve, reject) => rebind.close(error => error ? reject(error) : resolve()));
            }
            relayResources.cleanupEvidence = { beforeClose, afterClose, listening: relayResources.relay.server.listening, portRebound: true };
        }
    };
    // Register before certificate, port, server, or Host setup can fail.
    world.resources.hubWatchRelay = relayResources;
    await startManifestHost(world, "built", async (configuration, context) => {
        const tls = context.isolation.createVerser2TlsCredentials();
        relayResources.tls = tls;
        const relayPort = await context.isolation.reservePort();
        const relay = new HubEventWatchH2Relay({
            runId: relayResources.runId,
            listenPort: relayPort,
            upstreamPort: context.runnerPort,
            cert: readFileSync(tls.certFile, "utf8"),
            key: readFileSync(tls.keyFile, "utf8"),
            ca: readFileSync(tls.caFile, "utf8")
        });
        relayResources.relay = relay;
        await relay.start();
        const verser2 = configuration.verser2;
        const runnerHost = verser2.runnerHost;
        relayResources.targetId = verser2.guest.peerId;
        relayResources.routeDomain = verser2.guest.routeDomain;
        configuration.logLevel = "DEBUG";
        configuration.logColors = false;
        verser2.runnerHost = {
            ...runnerHost,
            caFile: tls.caFile,
            host: {
                ...runnerHost.host,
                bindHost: "127.0.0.1",
                bindPort: context.runnerPort,
                publicUrl: `https://localhost:${relayPort}`,
                tls: { ...runnerHost.host.tls, certFile: tls.certFile, keyFile: tls.keyFile, mtlsRequired: false }
            }
        };
        process.stdout.write(`[hub-event-watch-relay.setup] ${JSON.stringify({ runId: relayResources.runId, advertisedUrl: `https://localhost:${relayPort}`, upstreamUrl: relay.upstreamUrl, bindHost: runnerHost.host.bindHost, bindPort: context.runnerPort, tlsVerification: "enabled" })}\n`);
    });
}

/** Uploaded observer healthy-idle passthrough through the actual routed Agent response path. */
export async function proveHostedNativeHealthyIdleRelay(world: WatchWorld): Promise<Record<string, any>> {
    const relayResources = world.resources.hubWatchRelay as HostedRelayResources;
    assert.ok(relayResources?.relay, "native H2 relay must be running before the Host starts");
    const state = world.resources.runtimeManifestHost;
    assert.ok(state, "relay-configured built Host must be running");
    const runId = relayResources.runId;
    const { HostClient } = require(state.artifacts.modules.apiClient) as { HostClient: typeof HostClientType };
    const host = new HostClient(state.apiBaseUrl);
    let observer: InstanceClient | undefined;
    let sequenceId: string | undefined;
    const event = async <T>(name: string, send: () => Promise<unknown>): Promise<T> => {
        const pending = observer!.getEvent(name);
        await send();
        return eventData<T>(await pending);
    };
    const command = (body: Record<string, unknown>) => observer!.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: randomUUID(), ...body }));
    const ack = async (watchId: string): Promise<Record<string, any>> => {
        const commandId = randomUUID();
        return event(`hub-watch-ack-${commandId}`, () => command({ action: "ack", read: false, watchId, commandId }));
    };
    const waitFor = async (watchId: string, predicate: (record: Record<string, any>, ack: Record<string, any>) => boolean, timeoutMs = 15_000) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const response = await ack(watchId);
            const found = (response.history || []).find((record: Record<string, any>) => record.watchId === watchId && predicate(record, response));
            if (found) return { record: found, acknowledgement: response };
            await new Promise(resolve => setTimeout(resolve, 40));
        }
        assert.fail(`Timed out waiting for actual hosted observer condition on ${watchId}`);
    };

    try {
        const archive = resolveFixturePackagePath("data/sequences/bdd-packages/hub-event-watch-observer.tar.gz");
        const uploaded = await host.sendSequence(createReadStream(archive));
        sequenceId = uploaded.id;
        observer = await uploaded.start({ appConfig: { runId }, args: [] });
        const ready = eventData<{ runId: string; provenance: Record<string, any> }>(await observer.getEvent("hub-watch-observer-ready"));
        assert.equal(ready.runId, runId);
        assert.equal(ready.provenance.runtime?.name, "node");
        const selectedDist = realpathSync(require("node:path").join(state.artifacts.workspaceRoot, "dist"));
        for (const name of ["runner-node", "rest-api2", "api-router"] as const) {
            const selected = ready.provenance.productModulePaths?.[name];
            assert.ok(selected, `hosted observer omitted selected ${name} artifact provenance`);
            assert.ok(realpathSync(selected).startsWith(`${selectedDist}${require("node:path").sep}`), `${name} resolved outside selected dist: ${selected}`);
        }
        const watchId = `${runId}-healthy-idle-sequence`;
        const openCommandId = randomUUID();
        const watchLogBaseline = new Set(watchLogRecords(state.hostUtils.output).map(item => item.watchId));
        const sourceId = `runner.${observer.id}.hub.broker`;
        const selection: HubWatchRelaySelection = {
            runId, watchId, openCommandId, sourceId, path: "/api/v2/events/watch?kind=sequence", kind: "sequence",
            targetId: relayResources.targetId, routeDomain: relayResources.routeDomain
        };
        relayResources.relay.selectWatch(selection);
        await command({ action: "open", kind: "sequence", watchId, consume: true, commandId: openCommandId });
        const snapshot = await waitFor(watchId, record => record.type === "snapshot" && record.commandId === openCommandId);
        assert.equal(snapshot.record.event?.type, "snapshot");
        assert.equal(snapshot.record.event?.kind, "sequence");
        assert.ok(snapshot.record.event?.cursor?.hubId && snapshot.record.event?.cursor?.epoch);
        const acquiredId = await waitForWatchLog(state.hostUtils, watchLogBaseline, "sequence", "acquired");
        const pendingCommandId = randomUUID();
        await command({ action: "pending-read", watchId, commandId: pendingCommandId });
        const pendingReady = await waitFor(watchId, (record, current) => record.type === "pending-ready" && record.commandId === pendingCommandId && current.hasPendingRead === true);
        assert.equal(pendingReady.acknowledgement.connectionHealth?.state, "live");

        const rest = require(state.artifacts.modules.restApi2) as typeof import("@scramjet/rest-api2");
        const mutations = rest.createHubClient({ transport: rest.createHttpClientTransport({ baseUrl: new URL(state.apiBaseUrl).origin, fetch }), basePath: "/api/v2" });
        const topic = `relay-filter-${runId}`;
        const create = await mutations.createTopic.post({ body: { topic: { name: topic, contentType: "application/x-ndjson" } }, headers: { "content-type": "application/json" } });
        assert.equal(create.status, 200);
        const remove = await mutations.deleteTopic.delete({ params: { name: topic }, headers: { "content-type": "application/json" } });
        assert.equal(remove.status, 200);

        // This deadline is local to this long healthy-idle scenario; no watch timeout is changed.
        const snapshotReceiptMs = Number(snapshot.record.clientReceiptMonotonicMs);
        assert.ok(Number.isFinite(snapshotReceiptMs), "observer must report its own complete-snapshot monotonic receipt time");
        const deadline = snapshotReceiptMs + 17_000;
        let currentAck = pendingReady.acknowledgement;
        while (Number(process.hrtime.bigint()) / 1e6 < deadline) {
            currentAck = await ack(watchId);
            assert.equal(currentAck.connectionHealth?.state, "live", "watch health must remain live across healthy idle heartbeats");
            assert.equal(currentAck.hasPendingRead, true, "the original application next() must still be pending");
            assert.ok(!(currentAck.history || []).some((record: any) => record.watchId === watchId && record.type === "change"), "other-kind topic changes must not yield sequence changes");
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        assert.ok(Number(process.hrtime.bigint()) / 1e6 - snapshotReceiptMs >= 17_000, "hosted observer must remain healthy >16s after its snapshot");
        currentAck = await ack(watchId);
        assert.equal(currentAck.connectionHealth?.state, "live");
        assert.equal(currentAck.hasPendingRead, true);
        const relayEvidence = relayResources.relay.snapshot();
        assert.equal(relayEvidence.mode, "pass");
        assert.equal(relayEvidence.selectedMatches, 1, "exactly one SDK request must match the armed watch selector");
        const watchEvidence = relayEvidence.watches.find((watch: any) => watch.requestId);
        assert.ok(watchEvidence, "relay must retain bounded metadata for the selected routed watch stream");
        assert.equal(watchEvidence.sourceId, sourceId);
        assert.equal(watchEvidence.path, selection.path);
        assert.equal(watchEvidence.method, "GET");
        assert.equal(watchEvidence.snapshotCount, 1);
        assert.ok(watchEvidence.heartbeatCount >= 3, `expected complete server heartbeat frames across >16s idle; saw ${watchEvidence.heartbeatCount}`);
        assert.equal(watchEvidence.changeCount, 0, "the selected sequence watch must have no business changes during topic-only mutations");
        assert.ok(relayEvidence.sessionsOpened >= 1 && relayEvidence.sessionsOpened === relayEvidence.sessionsClosed + relayEvidence.sessionPairs,
            "each observed downstream H2 session must have one separately owned upstream pairing");
        assert.ok(relayEvidence.watches.length <= 8 && watchEvidence.frames.length <= 64, "relay evidence retention must remain bounded");

        const closeCommandId = randomUUID();
        await command({ action: "close", watchId, commandId: closeCommandId });
        const terminal = await waitFor(watchId, record => record.type === "closed" && record.commandId === closeCommandId);
        assert.equal(terminal.record.actualState, "closed");
        assert.equal(terminal.record.pendingRead?.kind, "done");
        await waitForWatchLog(state.hostUtils, watchLogBaseline, "sequence", "released", acquiredId);
        const finishId = randomUUID();
        await event(`hub-watch-finished`, () => command({ action: "finish", commandId: finishId }));
        try { await observer.stop(1_000, false); } catch { /* completed main may already have left the Host instance registry */ }
        const exitDeadline = Date.now() + 10_000;
        let observerExitConfirmed = false;
        while (Date.now() < exitDeadline) {
            const info = await host.getInstanceInfo(observer.id);
            if (info.ended) { observerExitConfirmed = true; break; }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        assert.ok(observerExitConfirmed, "observer must exit gracefully and report an actual ended timestamp from the Host instance registry");
        observer = undefined;
        try { await host.deleteSequence(sequenceId); } catch { /* scenario isolation removes the still-owned sequence tree at teardown */ }
        sequenceId = undefined;
        host.dispose();
        const result = {
            runId,
            watchId,
            openCommandId,
            snapshotCursor: snapshot.record.event.cursor,
            snapshotReceiptMonotonicMs: snapshotReceiptMs,
            observerElapsedMs: Number(process.hrtime.bigint()) / 1e6 - snapshotReceiptMs,
            observerHealth: currentAck.connectionHealth,
            pendingRead: currentAck.hasPendingRead,
            observerExitConfirmed,
            filteredMutations: { createStatus: create.status, removeStatus: remove.status, selectedChanges: watchEvidence.changeCount },
            relay: relayEvidence,
            acquiredId,
            releasedId: acquiredId,
            observer: ready.provenance
        };
        relayResources.result = result;
        process.stdout.write(`[hub-event-watch-relay.healthy-idle] ${JSON.stringify(result)}\n`);
        return result;
    } finally {
        if (observer) {
            try { await command({ action: "finish", commandId: randomUUID() }); } catch { /* preserve primary failure */ }
            try { await observer.stop(1_000, false); } catch { /* Host teardown remains available */ }
        }
        if (sequenceId) { try { await host.deleteSequence(sequenceId); } catch { /* scenario isolation retains ownership */ } }
        host.dispose();
    }
}

export type HostedRelayFault = "silence" | "stream-loss" | "gap";

/** Drives one real hosted fault through the selected BrokerAgent request stream. */
export async function proveHostedNativeRelayFault(world: WatchWorld, fault: HostedRelayFault): Promise<Record<string, any>> {
    const relayResources = world.resources.hubWatchRelay as HostedRelayResources;
    assert.ok(relayResources?.relay, "native H2 relay must be running before fault induction");
    const state = world.resources.runtimeManifestHost;
    assert.ok(state, "relay-configured built Host must be running");
    const runId = relayResources.runId;
    const { HostClient } = require(state.artifacts.modules.apiClient) as { HostClient: typeof HostClientType };
    const host = new HostClient(state.apiBaseUrl);
    let observer: InstanceClient | undefined;
    let observerSequenceId: string | undefined;
    let droppedSequenceId: string | undefined;
    const event = async <T>(name: string, send: () => Promise<unknown>): Promise<T> => {
        const pending = observer!.getEvent(name);
        await send();
        return eventData<T>(await pending);
    };
    const command = (body: Record<string, unknown>) => observer!.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: randomUUID(), ...body }));
    const ack = async (watchId: string): Promise<Record<string, any>> => {
        const commandId = randomUUID();
        return event(`hub-watch-ack-${commandId}`, () => command({ action: "ack", read: false, watchId, commandId }));
    };
    const waitFor = async (
        watchId: string,
        predicate: (record: Record<string, any>, ack: Record<string, any>) => boolean,
        timeoutMs = 20_000
    ) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const response = await ack(watchId);
            const found = (response.history || []).find((record: Record<string, any>) => record.watchId === watchId && predicate(record, response));
            if (found) return { record: found, acknowledgement: response };
            await new Promise(resolve => setTimeout(resolve, 40));
        }
        assert.fail(`Timed out waiting for ${fault} observer condition on ${watchId}`);
    };
    const awaitRelease = (baseline: Set<string>, kind: string, id: string) => waitForWatchLog(state.hostUtils, baseline, kind, "released", id);

    try {
        const archive = resolveFixturePackagePath("data/sequences/bdd-packages/hub-event-watch-observer.tar.gz");
        const uploadedObserver = await host.sendSequence(createReadStream(archive));
        observerSequenceId = uploadedObserver.id;
        observer = await uploadedObserver.start({ appConfig: { runId }, args: [] });
        const ready = eventData<{ runId: string; provenance: Record<string, any> }>(await observer.getEvent("hub-watch-observer-ready"));
        assert.equal(ready.runId, runId);
        assert.equal(ready.provenance.runtime?.name, "node");
        const selectedDist = realpathSync(require("node:path").join(state.artifacts.workspaceRoot, "dist"));
        for (const name of ["runner-node", "rest-api2", "api-router"] as const) {
            const selected = ready.provenance.productModulePaths?.[name];
            assert.ok(selected, `hosted observer omitted selected ${name} artifact provenance`);
            assert.ok(realpathSync(selected).startsWith(`${selectedDist}${require("node:path").sep}`), `${name} resolved outside selected dist: ${selected}`);
        }
        const relay = relayResources.relay!;
        const sourceId = `runner.${observer.id}.hub.broker`;
        const controlWatchId = `${runId}-${fault}-control-topic`;
        const controlBaseline = new Set(watchLogRecords(state.hostUtils.output).map(item => item.watchId));
        const controlOpenId = randomUUID();
        await command({ action: "open", kind: "topic", watchId: controlWatchId, consume: true, commandId: controlOpenId });
        const controlSnapshot = await waitFor(controlWatchId, record => record.type === "snapshot" && record.commandId === controlOpenId);
        assert.equal(controlSnapshot.record.event?.type, "snapshot");
        const controlServerId = await waitForWatchLog(state.hostUtils, controlBaseline, "topic", "acquired");

        const watchId = `${runId}-${fault}-target-sequence`;
        const openCommandId = randomUUID();
        const selection: HubWatchRelaySelection = { runId, watchId, openCommandId, sourceId, path: "/api/v2/events/watch?kind=sequence", kind: "sequence" };
        const targetBaseline = new Set(watchLogRecords(state.hostUtils.output).map(item => item.watchId));
        relay.selectWatch(selection);
        relay.setMode(fault === "silence" ? "silenceAfterSnapshot" : fault === "gap" ? "dropNextChange" : "pass");
        await command({ action: "open", kind: "sequence", watchId, consume: true, sampleScheduler: fault === "silence", commandId: openCommandId });
        const snapshot = await waitFor(watchId, record => record.type === "snapshot" && record.commandId === openCommandId);
        assert.equal(snapshot.record.event?.type, "snapshot");
        assert.equal(snapshot.record.event?.kind, "sequence");
        assert.ok(snapshot.record.event?.cursor?.hubId && snapshot.record.event?.cursor?.epoch);
        const targetServerId = await waitForWatchLog(state.hostUtils, targetBaseline, "sequence", "acquired");
        const pendingCommandId = randomUUID();
        await command({ action: "pending-read", watchId, commandId: pendingCommandId });
        const pending = await waitFor(watchId, (record, response) => record.type === "pending-ready" && record.commandId === pendingCommandId && response.hasPendingRead === true);
        assert.equal(pending.acknowledgement.connectionHealth?.state, "live");
        const mutationClient = require(state.artifacts.modules.restApi2) as typeof import("@scramjet/rest-api2");
        const httpClient = mutationClient.createHubClient({
            transport: mutationClient.createHttpClientTransport({ baseUrl: new URL(state.apiBaseUrl).origin, fetch }),
            basePath: "/api/v2"
        });

        const firstLiveRecord = (response: Record<string, any>) => (response.history || []).find((record: any) => record.watchId === watchId &&
            record.type === "connection-health" && record.health?.state === "live");
        const targetState = async () => {
            const response = await ack(watchId);
            return { response, live: firstLiveRecord(response) };
        };
        let faultError: { record: Record<string, any>; acknowledgement: Record<string, any> };
        let beforeTerminal: Record<string, any> | undefined;
        if (fault === "silence") {
            const live = await waitFor(watchId, record => record.type === "connection-health" && record.health?.state === "live");
            const snapshotFrame = relay.snapshot().watches.find((entry: any) => entry.requestId) as any;
            if (!snapshotFrame) assert.fail("selected real routed watch response must be captured by the relay");
            assert.equal(snapshotFrame.snapshotCount, 1);
            assert.equal(snapshotFrame.forwardedSnapshotCount, 1);
            beforeTerminal = { upstreamClosed: snapshotFrame.upstreamClosed, downstreamClosed: snapshotFrame.downstreamClosed, forwardedBytes: snapshotFrame.forwardedBytes };
            assert.equal(beforeTerminal.upstreamClosed, false);
            assert.equal(beforeTerminal.downstreamClosed, false);
            assert.ok(beforeTerminal.forwardedBytes > 0);
            faultError = await waitFor(watchId, record => record.type === "error" && record.error?.code === "WATCH_SILENCE_TIMEOUT", 25_000);
            const lost = await waitFor(watchId, record => record.type === "connection-health" && record.health?.state === "lost", 1000);
            const liveAt = Number(live.record.clientReceiptMonotonicMs);
            const lostAt = Number(lost.record.clientReceiptMonotonicMs);
            const elapsed = lostAt - liveAt;
            const silenceState = await targetState();
            const lagMs = Number(silenceState.response.scheduler?.maxLagMs);
            const expectedDueAt = liveAt + 15_000;
            const effectiveDeadlineLagMs = lostAt - expectedDueAt;
            assert.ok(Number.isFinite(elapsed) && elapsed >= 14_000 && elapsed <= 16_000, `actual same-observer live-to-lost elapsed was ${elapsed}ms`);
            assert.ok(Number.isFinite(lagMs) && lagMs <= 1_000, `100ms client-process scheduler sampler saw ${lagMs}ms lag`);
            assert.ok(effectiveDeadlineLagMs <= 1_000, `loss happened ${effectiveDeadlineLagMs}ms after the 15s last-live deadline`);
            const evidence = relay.snapshot().watches.find((entry: any) => entry.requestId) as any;
            if (!evidence) assert.fail("selected silent watch evidence must remain available through timeout settlement");
            assert.equal(evidence.forwardedSnapshotCount, 1);
            assert.equal(evidence.forwardedHeartbeatCount, 0);
            assert.equal(evidence.forwardedChangeCount, 0);
            assert.equal(evidence.forwardedBytes, beforeTerminal.forwardedBytes, "no bytes after the complete snapshot may be forwarded");
            assert.ok(evidence.droppedBytes > 0, "relay must actively drop the post-snapshot response bytes while continuing to drain upstream");
            assert.ok(evidence.upstreamClosed && evidence.downstreamClosed, "client silence loss must cancel the actual routed stream after terminal selection");
            const result = { elapsedMs: elapsed, clockDomain: "hosted-observer-process.hrtime.bigint", expectedDueAfterLastLiveMs: 15_000,
                expectedDueAtMonotonicMs: expectedDueAt, effectiveDeadlineLagMs, scheduler: silenceState.response.scheduler,
                firstLiveMonotonicMs: liveAt, lostMonotonicMs: lostAt, streamOpenBeforeTerminal: beforeTerminal, relay: evidence };
            relayResources.result = result;
            (faultError as any).silenceResult = result;
        } else if (fault === "stream-loss") {
            await waitFor(watchId, record => record.type === "connection-health" && record.health?.state === "live");
            relay.setMode("resetWatch");
            beforeTerminal = relay.resetSelectedWatch();
            assert.equal(beforeTerminal.reset, true);
            faultError = await waitFor(watchId, record => record.type === "error" && record.error?.code === "WATCH_DISCONNECTED", 10_000);
            assert.equal((await ack(watchId)).connectionHealth?.state, "lost");
        } else {
            const producerArchive = resolveFixturePackagePath("data/sequences/bdd-packages/hub-event-watch-observer.tar.gz");
            const change = await host.sendSequence(createReadStream(producerArchive));
            droppedSequenceId = change.id;
            const changeDeadline = Date.now() + 10_000;
            let sourceChangeEvidence: any;
            while (Date.now() < changeDeadline && !sourceChangeEvidence) {
                sourceChangeEvidence = relay.snapshot().watches.find((entry: any) => entry.requestId)?.frames.find((frame: any) =>
                    frame.kind === "change" && frame.action === "upsert" && frame.sequenceId === change.id);
                if (!sourceChangeEvidence) await new Promise(resolve => setTimeout(resolve, 25));
            }
            assert.ok(sourceChangeEvidence, "relay must observe one actual sequence upload frame before dropping its original bytes");
            faultError = await waitFor(watchId, record => record.type === "error" && record.error?.code === "WATCH_GAP", 15_000);
            const evidence = relay.snapshot().watches.find((entry: any) => entry.requestId) as any;
            if (!evidence) assert.fail("selected dropped-change evidence must remain available after GAP");
            const droppedFrame = evidence.frames.find((frame: any) => frame.kind === "change" && frame.cursor?.position === evidence.droppedChangeCursor?.position);
            assert.ok(droppedFrame, "relay must identify one real selected change and its actual cursor");
            assert.equal(droppedFrame.sequenceId, change.id, "dropped selected change must correlate with the real uploaded sequence mutation");
            assert.equal(evidence.changeCount, 1);
            assert.equal(evidence.forwardedChangeCount, 0);
            assert.ok(evidence.droppedBytes > 0);
            const gapHeartbeat = evidence.frames.find((frame: any) => frame.kind === "heartbeat" && frame.deliveredCursor?.position === evidence.droppedChangeCursor?.position);
            assert.ok(gapHeartbeat, "subsequent real heartbeat must preserve the server's cursor for the dropped selected change");
            assert.ok(evidence.forwardedHeartbeatCount >= 1, "subsequent real heartbeat must pass through unchanged after the dropped change");
            assert.ok(gapHeartbeat.deliveredCursor.position > snapshot.record.event.cursor.position, "heartbeat deliveredCursor must expose the real selected frame that the relay dropped");
            beforeTerminal = { droppedCursor: evidence.droppedChangeCursor, selectedChangeSequenceId: droppedFrame.sequenceId, heartbeat: gapHeartbeat, relay: evidence };
            relayResources.result = beforeTerminal;
        }

        await awaitRelease(targetBaseline, "sequence", targetServerId);
        const terminalHealth = await ack(watchId);
        assert.equal(terminalHealth.connectionHealth?.state, "lost");
        assert.equal(terminalHealth.hasPendingRead, false);
        const targetEvidenceAtTerminal = relay.snapshot().watches.find((entry: any) => entry.requestId);
        assert.ok(targetEvidenceAtTerminal?.upstreamClosed && targetEvidenceAtTerminal?.downstreamClosed, "actual target request stream must close after the observer's terminal result");
        assert.ok(relay.snapshot().sessionPairs >= 1, "target stream fault must preserve its shared H2 session for control traffic");
        relay.setMode("pass");

        // Real control watch mutation and status probe traverse the same uploaded observer's shared Agent.
        const controlPendingId = randomUUID();
        await command({ action: "pending-read", watchId: controlWatchId, commandId: controlPendingId });
        await waitFor(controlWatchId, (record, response) => record.type === "pending-ready" && record.commandId === controlPendingId && response.hasPendingRead === true);
        const topic = `relay-fault-control-${fault}-${runId}`;
        const created = await httpClient.createTopic.post({ body: { topic: { name: topic, contentType: "application/x-ndjson" } }, headers: { "content-type": "application/json" } });
        assert.equal(created.status, 200);
        const controlUpsert = await waitFor(controlWatchId, record => record.type === "change" && record.event?.topic === topic && record.event?.action === "upsert");
        assert.equal(controlUpsert.record.event.value?.name, topic);
        const probeId = randomUUID();
        const probe = await event<{ status: number }>(`hub-watch-probe-${probeId}`, () => command({ action: "probe", commandId: probeId }));
        assert.equal(probe.status, 200);
        const sharedSessionPairsDuringControl = relay.snapshot().sessionPairs;
        assert.ok(sharedSessionPairsDuringControl >= 1, "same BrokerAgent session must remain open while the independent control watch and status probe succeed");
        const removePendingId = randomUUID();
        await command({ action: "pending-read", watchId: controlWatchId, commandId: removePendingId });
        await waitFor(controlWatchId, (record, response) => record.type === "pending-ready" && record.commandId === removePendingId && response.hasPendingRead === true);
        const removed = await httpClient.deleteTopic.delete({ params: { name: topic }, headers: { "content-type": "application/json" } });
        assert.equal(removed.status, 200);
        await waitFor(controlWatchId, record => record.type === "change" && record.event?.topic === topic && record.event?.action === "remove");

        let freshSnapshot: Record<string, any> | undefined;
        let freshServerId: string | undefined;
        let oldTerminalState: string | undefined;
        if (fault === "gap") {
            const oldCloseCommand = randomUUID();
            await command({ action: "close", watchId, commandId: oldCloseCommand });
            await waitFor(watchId, record => record.type === "closed" && record.commandId === oldCloseCommand);
            relay.setMode("pass");
            const freshId = `${runId}-gap-recovery-snapshot`;
            const freshOpenCommand = randomUUID();
            const freshBaseline = new Set(watchLogRecords(state.hostUtils.output).map(item => item.watchId));
            const freshSelection = { ...selection, watchId: freshId, openCommandId: freshOpenCommand };
            relay.selectWatch(freshSelection);
            await command({ action: "open", kind: "sequence", watchId: freshId, consume: true, commandId: freshOpenCommand });
            const fresh = await waitFor(freshId, record => record.type === "snapshot" && record.commandId === freshOpenCommand);
            freshSnapshot = fresh.record.event;
            assert.ok(freshSnapshot?.items?.some((item: any) => item.id === droppedSequenceId), "fresh snapshot after terminal GAP must include the intervening real upload");
            freshServerId = await waitForWatchLog(state.hostUtils, freshBaseline, "sequence", "acquired");
            const oldAck = await ack(watchId);
            oldTerminalState = oldAck.connectionHealth?.state;
            assert.equal(oldTerminalState, "lost", "opening a fresh snapshot must not revive the terminal GAP watch");
            const closeFresh = randomUUID();
            await command({ action: "close", watchId: freshId, commandId: closeFresh });
            await waitFor(freshId, record => record.type === "closed" && record.commandId === closeFresh);
            await waitForWatchLog(state.hostUtils, freshBaseline, "sequence", "released", freshServerId);
        } else {
            const closeTarget = randomUUID();
            await command({ action: "close", watchId, commandId: closeTarget });
            await waitFor(watchId, record => record.type === "closed" && record.commandId === closeTarget);
            oldTerminalState = (await ack(watchId)).connectionHealth?.state;
        }
        await command({ action: "close", watchId: controlWatchId, commandId: randomUUID() });
        await waitForWatchLog(state.hostUtils, controlBaseline, "topic", "released", controlServerId);
        const finishId = randomUUID();
        await event("hub-watch-finished", () => command({ action: "finish", commandId: finishId }));
        try { await observer.stop(1_000, false); } catch { /* normal main completion may precede a stop request */ }
        const exitDeadline = Date.now() + 10_000;
        let observerExitConfirmed = false;
        while (Date.now() < exitDeadline) {
            if ((await host.getInstanceInfo(observer.id)).ended) { observerExitConfirmed = true; break; }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        assert.ok(observerExitConfirmed, "fault observer must finish and report an actual ended timestamp");
        observer = undefined;
        try { await host.deleteSequence(observerSequenceId); } catch { /* scenario isolation retains ownership of the fixture tree */ }
        observerSequenceId = undefined;
        if (droppedSequenceId) try { await host.deleteSequence(droppedSequenceId); } catch { /* ended owner metadata can retain the uploaded row until scenario cleanup */ }
        host.dispose();
        const relayEvidence = relay.snapshot();
        assert.equal(relayEvidence.mode, "pass", "fault mode must be cleared before auxiliary session cleanup");
        assert.ok(relayEvidence.watches.length <= 8);
        const result = {
            fault, runId, watchId, openCommandId, initialSnapshotCursor: snapshot.record.event.cursor, targetRequestId: targetEvidenceAtTerminal?.requestId,
            sourceId, targetId: targetEvidenceAtTerminal?.targetId, routeDomain: targetEvidenceAtTerminal?.routeDomain,
            serverAcquiredId: targetServerId, serverReleasedId: targetServerId,
            actualError: faultError.record.error, lostHealth: terminalHealth.connectionHealth,
            pendingReadSettled: terminalHealth.hasPendingRead === false,
            streamOpenBeforeTerminal: beforeTerminal, streamAfterTerminal: targetEvidenceAtTerminal,
            controlWatch: { acquiredId: controlServerId, releasedId: controlServerId, upsertStatus: created.status, deleteStatus: removed.status, probeStatus: probe.status },
            sharedSessionPairsDuringControl,
            relay: relayEvidence, freshSnapshot: freshSnapshot ? { cursor: freshSnapshot.cursor, containsRealUpload: true, acquiredId: freshServerId, releasedId: freshServerId } : undefined,
            oldTerminalState, observerExitConfirmed, observer: ready.provenance
        };
        if (fault === "silence") {
            (result as any).silence = (faultError as any).silenceResult;
            process.stdout.write(`[hub-event-watch-relay.fault.silence] ${JSON.stringify(result)}\n`);
        } else process.stdout.write(`[hub-event-watch-relay.fault.${fault}] ${JSON.stringify(result)}\n`);
        relayResources.result = result;
        return result;
    } finally {
        if (observer) {
            try { await command({ action: "finish", commandId: randomUUID() }); } catch { /* preserve the primary assertion */ }
            try { await observer.stop(1_000, false); } catch { /* Host teardown remains available */ }
        }
        if (observerSequenceId) { try { await host.deleteSequence(observerSequenceId); } catch { /* scenario isolation owns remaining sequence files */ } }
        if (droppedSequenceId) { try { await host.deleteSequence(droppedSequenceId); } catch { /* scenario isolation owns remaining sequence files */ } }
        host.dispose();
    }
}

type NativeCleanupResources = {
    isolation: ScenarioIsolation;
    tls?: MtlsControlIngress;
    broker?: any;
    agent?: any;
    utils?: any;
    client?: any;
    cleanup: () => Promise<void>;
    hubId?: string;
    routeDomain?: string;
    guestPeerId?: string;
    brokerId?: string;
    sdkPath?: string;
    sdkVersion?: string;
    verserCommonPath?: string;
    nodeFetchPath?: string;
    watches: Set<any>;
};

/** Prepares the real Host control ingress and authenticated external SDK Agent. */
export async function prepareAuthenticatedNativeCleanup(world: WatchWorld): Promise<void> {
    const isolation = world.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must own the native control ingress");
    const native: NativeCleanupResources = {
        isolation,
        watches: new Set(),
        cleanup: async () => {
            for (const watch of native.watches) await watch.close().catch(() => undefined);
            native.watches.clear();
            native.utils?.dispose?.();
            native.agent?.destroy?.();
            await native.broker?.close?.("authenticated native watch scenario cleanup");
        }
    };
    world.resources.hubWatchNativeCleanup = native;
    native.tls = await isolation.createMtlsControlIngress();
    const suffix = randomUUID().replace(/-/g, "");
    native.hubId = `watch-native-${suffix}`;
    native.guestPeerId = `watch-native-guest-${suffix}`;
    native.routeDomain = `watch-native-${suffix}.test`;
    native.brokerId = `watch-native-broker-${suffix}`;

    await startNativeConfiguredHost(world, {
        id: native.hubId,
        controlIngress: native.tls.hostConfig(native.guestPeerId, native.routeDomain)
    });

    const state = world.resources.runtimeManifestHost;
    assert.ok(state, "Configured DEBUG built Host must run before native Broker setup");
    const sdkRequire = createRequire(require.resolve("../../dist/runner-node/package.json"));
    const sdk = sdkRequire("@signicode/verser2-guest-node");
    native.sdkPath = realpathSync(sdkRequire.resolve("@signicode/verser2-guest-node"));
    native.sdkVersion = JSON.parse(readFileSync(require("node:path").join(require("node:path").dirname(native.sdkPath), "..", "package.json"), "utf8")).version;
    native.verserCommonPath = realpathSync(sdkRequire.resolve("@signicode/verser-common"));
    const clientUtilsPath = require("./published-artifacts").resolvePublishedModule("@scramjet/client-utils", { workspaceRoot: state.artifacts.workspaceRoot });
    const clientUtilsRequire = createRequire(clientUtilsPath);
    const { ClientUtilsCustomAgent } = clientUtilsRequire(clientUtilsPath);
    const nodeFetch = clientUtilsRequire("node-fetch").default;
    native.nodeFetchPath = realpathSync(clientUtilsRequire.resolve("node-fetch"));
    native.broker = sdk.createVerserBroker({
        hostUrl: native.tls.publicUrl,
        brokerId: native.brokerId,
        tls: {
            ca: readFileSync(native.tls.allowedClient.caFile, "utf8"),
            cert: readFileSync(native.tls.allowedClient.certFile, "utf8"),
            key: readFileSync(native.tls.allowedClient.keyFile, "utf8")
        }
    });
    const within = async <T>(operation: Promise<T>, label: string): Promise<T> => {
        let timer: NodeJS.Timeout | undefined;
        try {
            return await Promise.race([operation, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} exceeded 15s setup bound`)), 15_000); })]);
        } finally { if (timer) clearTimeout(timer); }
    };
    await within(native.broker.connect(), "native mTLS Broker connect");
    const deadline = Date.now() + 15_000;
    let routes: any[] = [];
    while (Date.now() < deadline) {
        routes = await native.broker.getRoutes();
        const matching = routes.filter(route => route.domain === native.routeDomain && route.targetId === native.guestPeerId);
        if (matching.length === 1) break;
        if (matching.length > 1) assert.fail(`Native control route was ambiguous: ${JSON.stringify(matching)}`);
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(routes.filter(route => route.domain === native.routeDomain && route.targetId === native.guestPeerId).length, 1,
        `Expected exactly one authenticated route for ${native.routeDomain} -> ${native.guestPeerId}; observed ${JSON.stringify(routes)}`);
    native.agent = native.broker.createAgent();
    native.utils = new ClientUtilsCustomAgent(`http://${native.routeDomain}`, native.agent);
    const rest = require(state.artifacts.modules.restApi2) as typeof import("@scramjet/rest-api2");
    const nativeFetch = (input: string | URL | Request, init: RequestInit = {}) => {
        const url = new URL(typeof input === "string" || input instanceof URL ? String(input) : input.url);
        const path = `${url.pathname.replace(/^\//, "")}${url.search}`;
        const method = init.method || (typeof input === "object" && "method" in input ? input.method : "GET") || "GET";
        return native.utils.request(method, path, { ...init, headers: init.headers || (typeof input === "object" && "headers" in input ? input.headers : undefined) });
    };
    // Keep the published node-fetch implementation explicit: it owns the incremental response stream.
    void nodeFetch;
    native.client = rest.createHubClient({
        transport: rest.createHttpClientTransport({ baseUrl: `http://${native.routeDomain}`, fetch: nativeFetch as any }),
        basePath: "/api/v2"
    });
    const identityValue: unknown = await within(native.client.ingressIdentity.get(), "native control ingress identity");
    if (identityValue === null || typeof identityValue !== "object" || !("status" in identityValue) || !("body" in identityValue)) {
        assert.fail("native ingress identity request returned an invalid response shape");
    }
    const identity = identityValue as { status: unknown; body: unknown };
    assert.equal(identity.status, 200);
    assert.deepEqual(identity.body, { level: "hub", serviceId: native.hubId, routeDomain: native.routeDomain });
    process.stdout.write(`[hub-event-watch-native.setup] ${JSON.stringify({ hubId: native.hubId, guestPeerId: native.guestPeerId, routeDomain: native.routeDomain, brokerId: native.brokerId, sdkPath: native.sdkPath, sdkVersion: native.sdkVersion, verserCommonPath: native.verserCommonPath, nodeFetchPath: native.nodeFetchPath })}\n`);
}

async function startNativeConfiguredHost(world: WatchWorld, identity: { id: string; controlIngress: Record<string, unknown> }): Promise<void> {
    const { startManifestHost } = require("./runtime-manifest-host") as typeof import("./runtime-manifest-host");
    const { hubWatchNativeCleanup: native } = world.resources;
    const tls = native.tls;
    assert.ok(tls);
    await startManifestHost(world, "built", (configuration: Record<string, any>) => {
        configuration.logLevel = "DEBUG";
        configuration.logColors = false;
        configuration.host = { ...configuration.host, id: identity.id };
        configuration.verser2 = { ...configuration.verser2, controlIngress: identity.controlIngress };
    });
}

/** Native mTLS watch lifecycle; this deliberately tests live cleanup after complete headers/snapshots. */
export async function proveAuthenticatedNativeCleanup(world: WatchWorld): Promise<CleanupResult[]> {
    const native = world.resources.hubWatchNativeCleanup as NativeCleanupResources;
    assert.ok(native?.client && native.agent && native.broker, "Authenticated native Broker/Agent setup did not complete");
    const state = world.resources.runtimeManifestHost;
    assert.ok(state);
    const host = state.hostUtils;
    const controlBaseline = new Set(watchLogRecords(host.output).map(item => item.watchId));
    const control = native.client.events.watch("topic");
    native.watches.add(control);
    const controlSnapshot = await control.next();
    assert.equal(controlSnapshot.value?.type, "snapshot");
    const controlId = await waitForWatchLog(host, controlBaseline, "topic", "acquired");
    const results: CleanupResult[] = [];
    try {
        for (const [index, kind] of (["sequence", "instance", "topic"] as const).entries()) {
            const baseline = new Set(watchLogRecords(host.output).map(item => item.watchId));
            const controller = index === 0 ? new AbortController() : undefined;
            const watch = native.client.events.watch(kind, controller ? { signal: controller.signal } : undefined);
            native.watches.add(watch);
            const snapshot = await watch.next();
            assert.equal(snapshot.done, false);
            assert.equal(snapshot.value.type, "snapshot");
            assert.equal(snapshot.value.kind, kind);
            const acquired = await waitForWatchLog(host, baseline, kind, "acquired");
            let outcome: string;
            if (index === 0) {
                const pending = watch.next();
                controller!.abort();
                await assert.rejects(pending, (error: Error) => error.name === "AbortError");
                await waitForWatchLog(host, baseline, kind, "released", acquired);
                outcome = "AbortError-after-snapshot";
            } else if (index === 1) {
                const pending = watch.next();
                const first = watch.close();
                assert.equal(first, watch.close(), "repeated close must return the identical Promise");
                await first;
                assert.deepEqual(await pending, { done: true, value: undefined });
                await waitForWatchLog(host, baseline, kind, "released", acquired);
                outcome = "close-pending-done-same-promise";
            } else {
                let changed!: () => void;
                const receivedChange = new Promise<void>(resolve => { changed = resolve; });
                const loop = (async () => {
                    for await (const event of watch) if (event.type === "change") { changed(); break; }
                })();
                const topic = `native-break-${randomUUID()}`;
                const created = await native.client.createTopic.post({ body: { topic: { name: topic, contentType: "application/x-ndjson" } }, headers: { "content-type": "application/json" } });
                assert.equal(created.status, 200);
                await receivedChange;
                await loop;
                await waitForWatchLog(host, baseline, kind, "released", acquired);
                outcome = "for-await-break-real-change";
                await native.client.deleteTopic.delete({ params: { name: topic }, headers: { "content-type": "application/json" } });
            }
            const released = await waitForWatchLog(host, baseline, kind, "released", acquired);
            const pending = control.next();
            const topic = `native-control-${randomUUID()}`;
            const created = await native.client.createTopic.post({ body: { topic: { name: topic, contentType: "application/x-ndjson" } }, headers: { "content-type": "application/json" } });
            assert.equal(created.status, 200);
            let upsert: any = await pending;
            while (upsert.value?.topic !== topic) upsert = await control.next();
            assert.equal(upsert.value?.action, "upsert");
            const removalPending = control.next();
            await native.client.deleteTopic.delete({ params: { name: topic }, headers: { "content-type": "application/json" } });
            let removal: any = await removalPending;
            while (removal.value?.topic !== topic) removal = await control.next();
            assert.equal(removal.value?.action, "remove");
            const status = await native.client.status.get();
            assert.equal(status.status, 200);
            results.push({ outcome, acquiredId: acquired, releasedId: released, controlUpsert: true, controlRemove: true, statusCode: status.status });
        }
        process.stdout.write(`[hub-event-watch-native.cleanup] ${JSON.stringify({ hubId: native.hubId, routeDomain: native.routeDomain, brokerId: native.brokerId, outcomes: results, controlWatchReleased: true, agentPreservedThroughProbes: true })}\n`);
        return results;
    } finally {
        await control.close();
        await waitForWatchLog(host, controlBaseline, "topic", "released", controlId);
        native.watches.delete(control);
    }
}

function watchLogRecords(output: string): Array<{ watchId: string; kind: string; message: string }> {
    const stripAnsi = (value: string) => value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
    const records: Array<{ watchId: string; kind: string; message: string }> = [];
    for (const line of stripAnsi(output).split(/\r?\n/)) {
        if (!line.includes("DEBUG") || !line.includes("Hub event watch")) continue;
        const field = (key: string) => line.match(new RegExp(`\\b${key}:\\s*(['\"])(.*?)\\1`))?.[2];
        const watchId = field("watchId");
        const kind = field("kind");
        const message = field("message");
        if (watchId && kind && message) records.push({ watchId, kind, message });
    }
    return records;
}

async function waitForWatchLog(host: HostUtils, baseline: Set<string>, kind: string, message: string, id?: string): Promise<string> {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
        const record = watchLogRecords(host.output).find(item => item.kind === kind && item.message === message && (id ? item.watchId === id : !baseline.has(item.watchId)));
        if (record) return record.watchId;
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.fail(`Timed out waiting for Hub event watch ${message} (${kind}); observed ${JSON.stringify(watchLogRecords(host.output).slice(-20))}`);
}

/** Real HTTP transport cancellation and DEBUG Host subscription-release correlation. */
export async function proveExternalHttpCleanup(world: WatchWorld): Promise<CleanupResult[]> {
    const state = world.resources.runtimeManifestHost;
    assert.ok(state, "DEBUG built Host must be running for external HTTP cleanup proof");
    const { createHubClient, createHttpClientTransport } = require(state.artifacts.modules.restApi2) as typeof import("@scramjet/rest-api2");
    const client = createHubClient({ transport: createHttpClientTransport({ baseUrl: new URL(state.apiBaseUrl).origin, fetch }), basePath: "/api/v2" });
    const controlBaseline = new Set(watchLogRecords(state.hostUtils.output).map(item => item.watchId));
    const control = client.events.watch("topic");
    const controlSnapshot = await control.next();
    assert.equal(controlSnapshot.value?.type, "snapshot");
    const host = state.hostUtils;
    const controlId = await waitForWatchLog(host, controlBaseline, "topic", "acquired");
    const results: CleanupResult[] = [];
    const kinds = ["sequence", "instance", "topic"] as const;
    try {
        for (let index = 0; index < kinds.length; index++) {
            const kind = kinds[index];
            const baseline = new Set(watchLogRecords(host.output).map(item => item.watchId));
            const controller = index === 0 ? new AbortController() : undefined;
            const watch = client.events.watch(kind, controller ? { signal: controller.signal } : undefined);
            assert.equal((await watch.next()).value?.type, "snapshot");
            const acquired = await waitForWatchLog(host, baseline, kind, "acquired");
            let pendingRead: Promise<unknown>;
            let outcome: string;
            if (index === 0) {
                pendingRead = watch.next();
                controller!.abort();
                await assert.rejects(pendingRead, (error: Error) => error.name === "AbortError");
                await waitForWatchLog(host, baseline, kind, "released", acquired);
                outcome = "AbortError";
            } else if (index === 1) {
                pendingRead = watch.next();
                const first = watch.close();
                const second = watch.close();
                assert.equal(first, second, "repeated close must return the identical cleanup promise");
                await first;
                const pendingResult = await pendingRead as IteratorResult<unknown>;
                assert.deepEqual(pendingResult, { done: true, value: undefined });
                outcome = "closed-done-same-promise";
                await waitForWatchLog(host, baseline, kind, "released", acquired);
            } else {
                let loopStarted!: () => void;
                const started = new Promise<void>(resolve => { loopStarted = resolve; });
                const loop = (async () => {
                    for await (const _event of watch) {
                        if (_event.type !== "change") continue;
                        loopStarted();
                        break;
                    }
                })();
                const breakTopic = `break-${randomUUID()}`;
                const createBreakTopic = await client.createTopic.post({ body: { topic: { name: breakTopic, contentType: "application/x-ndjson" } }, headers: { "content-type": "application/json" } });
                assert.equal(createBreakTopic.status, 200);
                await started;
                await loop;
                await client.deleteTopic.delete({ params: { name: breakTopic }, headers: { "content-type": "application/json" } });
                pendingRead = Promise.resolve();
                outcome = "for-await-break";
                await waitForWatchLog(host, baseline, kind, "released", acquired);
            }
            const controlPending = control.next();
            const controlName = `control-${randomUUID()}`;
            const create = await client.createTopic.post({ body: { topic: { name: controlName, contentType: "application/x-ndjson" } }, headers: { "content-type": "application/json" } });
            assert.equal(create.status, 200);
            let controlUpsert = await controlPending;
            while ((controlUpsert.value as any)?.topic !== controlName) controlUpsert = await control.next();
            assert.equal(controlUpsert.value?.type, "change");
            assert.equal(controlUpsert.value?.kind, "topic");
            assert.equal((controlUpsert.value as any).topic, controlName);
            const removePending = control.next();
            await client.deleteTopic.delete({ params: { name: controlName }, headers: { "content-type": "application/json" } });
            let controlRemove = await removePending;
            while ((controlRemove.value as any)?.topic !== controlName) controlRemove = await control.next();
            assert.equal(controlRemove.value?.type, "change");
            assert.equal((controlRemove.value as any).action, "remove");
            const status = await client.status.get();
            assert.equal(status.status, 200);
            results.push({ outcome, acquiredId: acquired, releasedId: acquired, controlUpsert: true, controlRemove: true, statusCode: status.status });
            void pendingRead;
        }
        return results;
    } finally {
        await control.close();
        await waitForWatchLog(host, controlBaseline, "topic", "released", controlId);
    }
}

/** Hosted Node observer proves request-scoped cleanup against real Host subscription logs. */
export async function proveHostedNodeCleanup(world: WatchWorld): Promise<Array<{ outcome: string; acquiredId: string; releasedId: string; controlUpsert: boolean; controlRemove: boolean; statusCode: number }>> {
    const state = world.resources.runtimeManifestHost;
    assert.ok(state, "The built Host Given must run before hosted Node cleanup proof");
    const runId = randomUUID();
    const { HostClient } = require(state.artifacts.modules.apiClient) as { HostClient: typeof HostClientType };
    const host = new HostClient(state.apiBaseUrl);
    let observer: InstanceClient | undefined;
    let observerSequenceId: string | undefined;
    const outcomes: Array<{ outcome: string; acquiredId: string; releasedId: string; controlUpsert: boolean; controlRemove: boolean; statusCode: number }> = [];
    const baseline = new Set(watchLogRecords(state.hostUtils.output).map(item => item.watchId));
    const runCommand = (body: Record<string, unknown>) => observer!.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: randomUUID(), ...body }));
    const event = async <T>(name: string, send: () => Promise<unknown>): Promise<T> => {
        const pending = observer!.getEvent(name);
        await send();
        return eventData<T>(await pending);
    };
    const readHistory = async (watchId: string): Promise<Array<Record<string, any>>> => {
        const commandId = randomUUID();
        const response = await event<{ history: Array<Record<string, any>> }>(`hub-watch-ack-${commandId}`, () => runCommand({ action: "ack", read: false, watchId, commandId }));
        return response.history.filter(record => record.watchId === watchId);
    };
    const waitFor = async (watchId: string, predicate: (record: Record<string, any>) => boolean): Promise<Record<string, any>> => {
        const deadline = Date.now() + 15_000;
        while (Date.now() < deadline) {
            const found = (await readHistory(watchId)).find(predicate);
            if (found) return found;
            await new Promise(resolve => setTimeout(resolve, 30));
        }
        assert.fail(`Timed out waiting for hosted observer record on ${watchId}`);
    };
    try {
        const archive = resolveFixturePackagePath("data/sequences/bdd-packages/hub-event-watch-observer.tar.gz");
        const uploaded = await host.sendSequence(createReadStream(archive));
        observerSequenceId = uploaded.id;
        observer = await uploaded.start({ appConfig: { runId }, args: [] });
        const ready = eventData<{ runId: string; provenance: Record<string, any> }>(await observer.getEvent("hub-watch-observer-ready"));
        assert.equal(ready.runId, runId);
        assert.equal(ready.provenance.runtime?.name, "node");
        const fs = require("node:fs") as typeof import("node:fs");
        const path = require("node:path") as typeof import("node:path");
        const selectedDistRoot = fs.realpathSync(path.join(state.artifacts.workspaceRoot, "dist"));
        for (const name of ["runner-node", "rest-api2", "api-router"] as const) {
            const resolved = ready.provenance.productModulePaths?.[name];
            assert.ok(resolved, `hosted observer provenance omitted ${name}`);
            assert.ok(fs.realpathSync(resolved).startsWith(`${selectedDistRoot}${path.sep}`), `${name} resolved outside selected built dist: ${resolved}`);
        }
        const rest = require(state.artifacts.modules.restApi2) as typeof import("@scramjet/rest-api2");
        const mutationClient = rest.createHubClient({ transport: rest.createHttpClientTransport({ baseUrl: new URL(state.apiBaseUrl).origin, fetch }), basePath: "/api/v2" });
        const controlId = `${runId}-control`;
        const openControl = randomUUID();
        await runCommand({ action: "open", kind: "topic", watchId: controlId, consume: true, commandId: openControl });
        await waitFor(controlId, record => record.commandId === openControl && record.type === "snapshot");
        const controlServerId = await waitForWatchLog(state.hostUtils, baseline, "topic", "acquired");
        baseline.add(controlServerId);

        for (const mode of ["abort", "close", "break"] as const) {
            const kind = mode === "break" ? "topic" : mode === "abort" ? "sequence" : "instance";
            const watchId = `${runId}-${mode}`;
            const openCommandId = randomUUID();
            await runCommand({ action: "open", kind, watchId, consume: mode !== "break", signal: mode === "abort", commandId: openCommandId });
            if (mode !== "break") {
                const snapshot = await waitFor(watchId, record => record.commandId === openCommandId && record.type === "snapshot");
                assert.equal(snapshot.event.kind, kind);
            }
            const acquired = await waitForWatchLog(state.hostUtils, baseline, kind, "acquired");
            baseline.add(acquired);
            let terminal: Record<string, any>;
            if (mode === "break") {
                const breakCommandId = randomUUID();
                await runCommand({ action: "break", consume: false, watchId, commandId: breakCommandId });
                terminal = await waitFor(watchId, record => record.commandId === breakCommandId && record.type === "closed");
                assert.equal(terminal.reason, "for-await-break");
                assert.ok(terminal.actualSnapshot?.type === "snapshot", "for-await must obtain the snapshot inside the actual loop");
                assert.equal(terminal.actualReturn, true);
            } else {
                const pendingRead = randomUUID();
                await runCommand({ action: "pending-read", watchId, commandId: pendingRead });
                await waitFor(watchId, record => record.commandId === pendingRead && record.type === "pending-ready");
                const commandId = randomUUID();
                await runCommand({ action: mode, watchId, commandId, repeat: mode === "close" });
                terminal = await waitFor(watchId, record => record.commandId === commandId && record.type === "closed");
                if (mode === "abort") {
                    assert.equal(terminal.actualState, "aborted");
                    assert.equal(terminal.pendingRead?.kind, "error");
                    assert.equal(terminal.pendingRead?.error?.name, "AbortError");
                } else {
                    assert.equal(terminal.actualState, "closed");
                    assert.equal(terminal.pendingRead?.kind, "done");
                    assert.equal(terminal.pendingRead?.done, true);
                    assert.equal(terminal.actualSamePromise, true);
                }
            }
            await waitForWatchLog(state.hostUtils, baseline, kind, "released", acquired);

            const topicName = `cleanup-${mode}-${runId}`;
            const pendingControl = randomUUID();
            await runCommand({ action: "pending-read", watchId: controlId, commandId: pendingControl });
            await waitFor(controlId, record => record.commandId === pendingControl && record.type === "pending-ready");
            const create = await mutationClient.createTopic.post({ body: { topic: { name: topicName, contentType: "application/x-ndjson" } }, headers: { "content-type": "application/json" } });
            assert.equal(create.status, 200);
            const upsert = await waitFor(controlId, record => record.type === "change" && record.event?.topic === topicName && record.event?.action === "upsert");
            assert.equal(upsert.event.kind, "topic");
            assert.equal(upsert.event.value?.name, topicName);
            const removeRead = randomUUID();
            await runCommand({ action: "pending-read", watchId: controlId, commandId: removeRead });
            await waitFor(controlId, record => record.commandId === removeRead && record.type === "pending-ready");
            const removed = await mutationClient.deleteTopic.delete({ params: { name: topicName }, headers: { "content-type": "application/json" } });
            assert.equal(removed.status, 200);
            const removal = await waitFor(controlId, record => record.type === "change" && record.event?.topic === topicName && record.event?.action === "remove");
            assert.equal(removal.event.value, null);
            const probeId = randomUUID();
            const probe = await event<{ status: number }>(`hub-watch-probe-${probeId}`, () => runCommand({ action: "probe", commandId: probeId }));
            assert.equal(probe.status, 200);
            outcomes.push({ outcome: mode === "abort" ? "aborted-pending-AbortError" : mode === "close" ? "closed-pending-done-same-promise" : "for-await-break-snapshot", acquiredId: acquired, releasedId: acquired, controlUpsert: true, controlRemove: true, statusCode: probe.status });
        }
        await runCommand({ action: "finish", commandId: randomUUID() });
        await observer.getEvent("hub-watch-finished");
        await waitForWatchLog(state.hostUtils, baseline, "topic", "released", controlServerId);
        world.resources.hubWatchCleanupProofComplete = true;
        return outcomes;
    } finally {
        if (observer) {
            try { await runCommand({ action: "finish", commandId: randomUUID() }); } catch { /* report primary failure */ }
            try { await observer.stop(1_000, false); } catch { /* scoped Host teardown remains available */ }
        }
        if (observerSequenceId) { try { await host.deleteSequence(observerSequenceId); } catch { /* scenario teardown owns residual cleanup */ } }
        host.dispose();
    }
}

function eventData<T>(value: unknown): T {
    const wrapper = value as { event?: { message?: unknown }; message?: unknown };
    const payload = wrapper?.event?.message ?? wrapper?.message ?? value;
    return (typeof payload === "string" ? JSON.parse(payload) : payload) as T;
}

/** Reads actual public snapshots from four watches opened inside the uploaded hosted Node observer. */
export async function proveHostedNodeSnapshots(world: WatchWorld): Promise<void> {
    const state = world.resources.runtimeManifestHost;
    assert.ok(state, "The built Host Given must run before the hosted Node event-watch proof");
    const runId = randomUUID();
    const { HostClient } = require(state.artifacts.modules.apiClient) as { HostClient: typeof HostClientType };
    const host = new HostClient(state.apiBaseUrl);
    let observer: InstanceClient | undefined;
    const ownedSequences: string[] = [];
    let hubId: string | undefined;
    let epoch: string | undefined;
    const send = (body: Record<string, unknown>) => observer!.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: randomUUID(), ...body }));
    try {
        const observerArchive = resolveFixturePackagePath("data/sequences/bdd-packages/hub-event-watch-observer.tar.gz");
        const observerSequence = await host.sendSequence(createReadStream(observerArchive));
        ownedSequences.push(observerSequence.id);
        observer = await observerSequence.start({ appConfig: { runId }, args: [] });
        const observerReady = eventData<{ runId: string; provenance: Record<string, any> }>(await observer.getEvent("hub-watch-observer-ready"));
        assert.equal(observerReady.runId, runId);
        assert.equal(observerReady.provenance.runtime?.name, "node");
        assert.equal(observerReady.provenance.execPath, process.execPath);
        const fs = require("node:fs") as typeof import("node:fs");
        const selectedDistRoot = fs.realpathSync(require("node:path").join(state.artifacts.workspaceRoot, "dist"));
        const productKeys = ["runner-node", "rest-api2", "api-router"] as const;
        for (const name of productKeys) {
            const path = observerReady.provenance.productModulePaths?.[name];
            assert.ok(path, `observer provenance omitted ${name}`);
            const realPath = fs.realpathSync(path);
            assert.ok(realPath.startsWith(`${selectedDistRoot}${require("node:path").sep}`), `${name} resolved outside selected artifact dist: ${realPath} (expected under ${selectedDistRoot})`);
        }
        for (const kind of ["sequence", "instance", "topic", "health"] as const) {
            const watchId = `${runId}-${kind}`;
            const openCommandId = randomUUID();
            await observer.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: openCommandId, action: "open", kind, watchId, consume: true }));
            const deadline = Date.now() + 15_000;
            let snapshot: WatchEvent | undefined;
            while (Date.now() < deadline && !snapshot) {
                const ackCommandId = randomUUID();
                const acknowledgementEvent: Promise<unknown> = observer.getEvent(`hub-watch-ack-${ackCommandId}`);
                await send({ action: "ack", watchId, read: true, commandId: ackCommandId });
                const ack = eventData<{ runId: string; commandId: string; watchId: string; history: Array<Record<string, any>> }>(await acknowledgementEvent);
                assert.equal(ack.runId, runId);
                assert.equal(ack.commandId, ackCommandId);
                assert.equal(ack.watchId, watchId);
                const recorded = ack.history.find((record: Record<string, any>) => record.watchId === watchId && record.commandId === openCommandId && record.type === "snapshot");
                if (recorded?.event) snapshot = recorded.event as WatchEvent;
                if (!snapshot) await new Promise(resolve => setTimeout(resolve, 50));
            }
            assert.ok(snapshot, `${kind} hosted watch did not record its actual snapshot before timeout`);
            assert.equal(snapshot.type, "snapshot");
            assert.equal(snapshot.kind, kind);
            assert.ok(snapshot.cursor.hubId && snapshot.cursor.epoch);
            assert.ok(Number.isSafeInteger(snapshot.cursor.position));
            if (hubId === undefined) {
                hubId = snapshot.cursor.hubId;
                epoch = snapshot.cursor.epoch;
            } else {
                assert.equal(snapshot.cursor.hubId, hubId, `${kind} snapshot belongs to a different Hub`);
                assert.equal(snapshot.cursor.epoch, epoch, `${kind} snapshot belongs to a different Hub epoch`);
            }
            if (kind === "sequence") assert.ok(Array.isArray(snapshot.items));
            if (kind === "instance") assert.ok(Array.isArray(snapshot.items));
            if (kind === "topic") assert.ok(Array.isArray(snapshot.items));
            if (kind === "health") assert.ok(Array.isArray(snapshot.items));
        }
        const finishCommandId = randomUUID();
        await send({ action: "finish", commandId: finishCommandId });
        const finished = eventData<{ commandId: string }>(await observer.getEvent("hub-watch-finished"));
        assert.equal(finished.commandId, finishCommandId);
        world.resources.hubWatchProofComplete = true;
    } finally {
        if (observer) {
            try { await send({ action: "finish" }); } catch { /* preserve primary failure */ }
        }
        for (const sequenceId of ownedSequences) {
            try { await host.deleteSequence(sequenceId); } catch { /* scenario teardown retains ownership of failed cleanup */ }
        }
        host.dispose();
    }
}

/** Exercises real hosted sequence/instance/manifest changes and the topic registry through the injected client. */
export async function proveHostedNodeMutationRevisionSnapshot(world: WatchWorld): Promise<void> {
    const state = world.resources.runtimeManifestHost;
    assert.ok(state, "The built Host Given must run before the hosted mutation proof");
    const runId = randomUUID();
    const { HostClient } = require(state.artifacts.modules.apiClient) as { HostClient: typeof HostClientType };
    const host = new HostClient(state.apiBaseUrl);
    let observer: InstanceClient | undefined;
    let producer: InstanceClient | undefined;
    const ownedSequences: string[] = [];
    const watches = new Map<string, { kind: string; openCommandId: string; cursor?: any }>();
    const send = (watchId: string, body: Record<string, unknown>) => observer!.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: randomUUID(), watchId, ...body }));
    const ackHistory = async (watchId: string): Promise<Array<Record<string, any>>> => {
        const commandId = randomUUID();
        const eventName = `hub-watch-ack-${commandId}`;
        const acknowledgementEvent: Promise<unknown> = observer!.getEvent(eventName);
        await send(watchId, { action: "ack", read: true, commandId });
        const response = eventData<{ runId: string; commandId: string; watchId: string; history: Array<Record<string, any>> }>(await acknowledgementEvent);
        assert.equal(response.runId, runId, `observer acknowledgement for ${watchId} has the wrong runId`);
        assert.equal(response.commandId, commandId, `observer acknowledgement for ${watchId} did not correlate`);
        assert.equal(response.watchId, watchId, `observer acknowledgement has the wrong watchId`);
        return response.history.filter(record => record.watchId === watchId);
    };
    const waitReady = async (watchId: string) => {
        const deadline = Date.now() + 15_000;
        while (Date.now() < deadline) {
            const records = await ackHistory(watchId);
            if (records.some(record => record.type === "pending-ready")) return records;
            await new Promise(resolve => setTimeout(resolve, 30));
        }
        assert.fail(`${watchId} did not establish an actual pending read before mutation`);
    };
    const open = async (kind: "sequence" | "instance" | "topic", label: string) => {
        const watchId = `${runId}-${label}`;
        const openCommandId = randomUUID();
        watches.set(watchId, { kind, openCommandId });
        await observer!.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: openCommandId, action: "open", kind, watchId, consume: true }));
        const deadline = Date.now() + 15_000;
        let snapshot: any;
        while (Date.now() < deadline && !snapshot) {
            const records = await ackHistory(watchId);
            snapshot = records.find(record => record.type === "snapshot" && record.commandId === openCommandId)?.event;
            if (!snapshot) await new Promise(resolve => setTimeout(resolve, 30));
        }
        assert.ok(snapshot, `${label} must consume its actual ${kind} initial snapshot`);
        assert.equal(snapshot.kind, kind);
        assert.equal(snapshot.type, "snapshot");
        watches.get(watchId)!.cursor = snapshot.cursor;
        return { watchId, snapshot };
    };
    const receive = async (watchId: string, expected: string, matches: (event: Record<string, any>) => boolean) => {
        const deadline = Date.now() + 20_000;
        while (Date.now() < deadline) {
            const history = await ackHistory(watchId);
            const watch = watches.get(watchId)!;
            const previous = watch.cursor;
            const changes = history.filter(item => item.type === "change" && item.event?.type === "change" && item.event?.cursor?.position > previous.position)
                .sort((a, b) => a.event.cursor.position - b.event.cursor.position);
            for (const record of changes) {
                assert.deepEqual(record.event.previousCursor, watch.cursor, `${expected}: ${watchId} previousCursor chain mismatch; observed ${JSON.stringify(record.event)}`);
                watch.cursor = record.event.cursor;
                if (matches(record.event)) return record.event;
            }
        }
        const recent = await ackHistory(watchId);
        assert.fail(`${expected}: no matching event on ${watchId}; observed ${JSON.stringify(recent.slice(-8).map(item => ({ type: item.type, kind: item.event?.kind, action: item.event?.action, sequenceId: item.event?.sequenceId, instanceId: item.event?.instanceId, topic: item.event?.topic, cursor: item.cursor, previousCursor: item.previousCursor })))}`);
    };
    const pending = async (watchId: string) => {
        const prior = await waitReady(watchId);
        const actionId = randomUUID();
        await send(watchId, { action: "pending-read", commandId: actionId });
        const all = await ackHistory(watchId);
        assert.ok(all.some(record => record.type === "pending-ready" && record.commandId === actionId && record.watchId === watchId), "pending-read must be recorded ready before its next() call in the same observer stack");
        assert.ok(prior.length > 0);
    };
    const producerAction = async (action: string) => {
        const commandId = randomUUID();
        const receiptPromise = producer!.getEvent(`hub-watch-producer-receipt-${commandId}`);
        await producer!.sendEvent("hub-watch-producer-action", JSON.stringify({ runId, commandId, action }));
        const result = eventData<{ runId: string; commandId: string; action: string; receipt: any }>(await receiptPromise);
        assert.equal(result.runId, runId);
        assert.equal(result.commandId, commandId);
        assert.equal(result.action, action);
        return result.receipt;
    };
    try {
        const observerArchive = resolveFixturePackagePath("data/sequences/bdd-packages/hub-event-watch-observer.tar.gz");
        const producerArchive = resolveFixturePackagePath("data/sequences/bdd-packages/hub-event-watch-producer.tar.gz");
        const observerSequence = await host.sendSequence(createReadStream(observerArchive));
        ownedSequences.push(observerSequence.id);
        observer = await observerSequence.start({ appConfig: { runId }, args: [] });
        const observerReady = eventData<{ runId: string; provenance: Record<string, any> }>(await observer.getEvent("hub-watch-observer-ready"));
        assert.equal(observerReady.runId, runId);
        assert.equal(observerReady.provenance.runtime?.name, "node");
        const fs = require("node:fs") as typeof import("node:fs");
        const selectedDistRoot = fs.realpathSync(require("node:path").join(state.artifacts.workspaceRoot, "dist"));
        for (const name of ["runner-node", "rest-api2", "api-router"] as const) {
            const path = observerReady.provenance.productModulePaths?.[name];
            assert.ok(path, `observer provenance omitted ${name}`);
            const realPath = fs.realpathSync(path);
            assert.ok(realPath.startsWith(`${selectedDistRoot}${require("node:path").sep}`), `${name} resolved outside selected artifact dist: ${realPath}`);
        }

        // Establish sequence and instance observers before the real producer starts.
        const sequenceWatch = await open("sequence", "sequence-mutations");
        const instanceWatch = await open("instance", "instance-mutations");
        const producerSequence = await host.sendSequence(createReadStream(producerArchive));
        ownedSequences.push(producerSequence.id);
        producer = await producerSequence.start({ appConfig: { runId, topic: `watch-${runId}` }, args: [] });
        const producerReady = eventData<{ receipt: any }>(await producer.getEvent("hub-watch-producer-ready"));
        const firstReceipt = producerReady.receipt;
        assert.ok(firstReceipt?.revision, "real producer initial declare must return its publication receipt");
        const sequenceId = producerSequence.id;
        const instanceId = firstReceipt.instanceId;
        assert.ok(sequenceId && instanceId, "producer publication receipt must identify sequence and instance");
        const uploadChange = await receive(sequenceWatch.watchId, "sequence upload", event => event.kind === "sequence" && event.action === "upsert" && event.sequenceId === sequenceId && event.value?.id === sequenceId);
        assert.ok(uploadChange);
        const memberChange = await receive(instanceWatch.watchId, "producer instance upsert", event => event.kind === "instance" && event.action === "upsert" && event.instanceId === instanceId && event.value?.id === instanceId);
        assert.ok(memberChange);
        await receive(sequenceWatch.watchId, "initial manifest publication", event => event.kind === "sequence" && event.action === "manifest" && event.sequenceId === sequenceId && event.instanceId === instanceId && event.manifestChange.revision === firstReceipt.revision);

        const manifestWatch = await open("sequence", "manifest-mutations");
        await pending(manifestWatch.watchId);
        const updateReceipt = await producerAction("update");
        const oldRevision = firstReceipt.revision;
        assert.notEqual(updateReceipt.revision, oldRevision, "a real producer update gets a fresh opaque revision");
        const updated = await receive(manifestWatch.watchId, "updated manifest publication", event => event.kind === "sequence" && event.action === "manifest" && event.manifestChange.action === "updated" && event.instanceId === instanceId && event.sequenceId === sequenceId && event.manifestChange.revision === updateReceipt.revision && event.manifestChange.previousRevision === oldRevision);
        assert.equal(updated.manifestChange.revision, updateReceipt.revision);

        await pending(manifestWatch.watchId);
        const identicalReceipt = await producerAction("publish");
        assert.notEqual(identicalReceipt.revision, updateReceipt.revision, "identical declaration submission must receive a different fresh revision");
        const identical = await receive(manifestWatch.watchId, "identical declaration manifest publication", event => event.kind === "sequence" && event.action === "manifest" && event.manifestChange.action === "updated" && event.instanceId === instanceId && event.sequenceId === sequenceId && event.manifestChange.revision === identicalReceipt.revision && event.manifestChange.previousRevision === updateReceipt.revision);
        assert.equal(identical.manifestChange.revision, identicalReceipt.revision);

        const topicWatch = await open("topic", "topic-registry");
        await pending(topicWatch.watchId);
        const topicName = `watch-${runId}`;
        const rest = require(state.artifacts.modules.restApi2) as typeof import("@scramjet/rest-api2");
        const topicClient = rest.createHubClient({ transport: rest.createHttpClientTransport({ baseUrl: new URL(state.apiBaseUrl).origin, fetch }), basePath: "/api/v2" });
        await topicClient.createTopic.post({ body: { topic: { name: topicName, contentType: "application/x-ndjson" } }, headers: { "content-type": "application/json" } });
        await receive(topicWatch.watchId, "topic registry upsert", event => event.kind === "topic" && event.action === "upsert" && event.topic === topicName && event.value?.name === topicName);
        await pending(topicWatch.watchId);
        await topicClient.deleteTopic.delete({ params: { name: topicName }, headers: { "content-type": "application/json" } });
        await receive(topicWatch.watchId, "topic registry removal", event => event.kind === "topic" && event.action === "remove" && event.topic === topicName && event.value === null);

        await pending(manifestWatch.watchId);
        const finishedPromise = producer.getEvent("hub-watch-producer-finished");
        const finishCommandId = randomUUID();
        await producer.sendEvent("hub-watch-producer-action", JSON.stringify({ runId, commandId: finishCommandId, action: "finish" }));
        const finished = eventData<{ commandId: string }>(await finishedPromise);
        assert.equal(finished.commandId, finishCommandId);
        const lastRevision = identicalReceipt.revision;
        const removed = await receive(manifestWatch.watchId, "producer manifest removal", event => event.kind === "sequence" && event.action === "manifest" && event.manifestChange.action === "removed" && event.instanceId === instanceId && event.sequenceId === sequenceId && event.manifestChange.previousRevision === lastRevision && event.manifestChange.revision === null && event.manifestChange.manifest === null);
        assert.equal(removed.manifestChange.previousRevision, lastRevision);

        // Close the old sequence subscription, make an intervening real upload, then demand a fresh snapshot.
        await send(sequenceWatch.watchId, { action: "close" });
        const additional = await host.sendSequence(createReadStream(observerArchive));
        ownedSequences.push(additional.id);
        const fresh = await open("sequence", "fresh-sequence-snapshot");
        assert.ok(fresh.snapshot.items.some((item: any) => item.id === additional.id), "fresh snapshot must contain the sequence uploaded after the prior watch closed");
        const current = fresh.snapshot.items.find((item: any) => item.id === sequenceId);
        assert.ok(current, "fresh snapshot retains the producer sequence record");
        assert.ok(!current.manifests.some((item: any) => item.instanceId === instanceId && item.sequenceId === sequenceId), "fresh snapshot excludes the removed instance manifest");

        const finishObserverPromise = observer.getEvent("hub-watch-finished");
        const observerFinishId = randomUUID();
        await observer.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: observerFinishId, action: "finish" }));
        const observerFinished = eventData<{ commandId: string }>(await finishObserverPromise);
        assert.equal(observerFinished.commandId, observerFinishId);
        world.resources.hubWatchProofComplete = true;
    } finally {
        for (const watchId of watches.keys()) {
            try { await send(watchId, { action: "close" }); } catch { /* preserve the primary failure */ }
        }
        for (const instance of [producer, observer]) {
            if (instance) { try { await instance.stop(1_000, false); } catch { /* Host teardown retains ownership */ } }
        }
        for (const sequenceId of ownedSequences) {
            try { await host.deleteSequence(sequenceId); } catch { /* scenario teardown retains ownership of failed cleanup */ }
        }
        host.dispose();
    }
}

/** Two actual owners of one uploaded producer prove instance-scoped revisions and snapshot retention. */
export async function proveHostedTwoInstanceManifestRevisions(world: WatchWorld): Promise<Record<string, any>> {
    const state = world.resources.runtimeManifestHost;
    assert.ok(state, "The built Host Given must run before the two-instance manifest proof");
    const runId = randomUUID();
    const { HostClient } = require(state.artifacts.modules.apiClient) as { HostClient: typeof HostClientType };
    const host = new HostClient(state.apiBaseUrl);
    let observer: InstanceClient | undefined;
    const producers: InstanceClient[] = [];
    const ownedSequences: string[] = [];
    const watches = new Map<string, { cursor?: any; serverWatchId?: string }>();
    let acquiredId: string | undefined;
    let releasedId: string | undefined;

    const action = (watchId: string, body: Record<string, unknown>) => observer!.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: randomUUID(), watchId, ...body }));
    const history = async (watchId: string): Promise<Array<Record<string, any>>> => {
        const commandId = randomUUID();
        const pending = observer!.getEvent(`hub-watch-ack-${commandId}`);
        await action(watchId, { action: "ack", read: true, commandId });
        const response = eventData<{ runId: string; commandId: string; watchId: string; history: Array<Record<string, any>> }>(await pending);
        assert.equal(response.runId, runId);
        assert.equal(response.commandId, commandId);
        assert.equal(response.watchId, watchId);
        return response.history.filter(record => record.watchId === watchId);
    };
    const watchLogBaseline = new Set<string>();
    const open = async (label: string): Promise<{ watchId: string; snapshot: Record<string, any> }> => {
        const watchId = `${runId}-${label}`;
        watches.set(watchId, {});
        const commandId = randomUUID();
        await action(watchId, { action: "open", kind: "sequence", consume: true, commandId });
        const deadline = Date.now() + 15_000;
        let snapshot: Record<string, any> | undefined;
        while (Date.now() < deadline && !snapshot) {
            snapshot = (await history(watchId)).find(record => record.type === "snapshot" && record.commandId === commandId)?.event;
            if (!snapshot) await new Promise(resolve => setTimeout(resolve, 30));
        }
        assert.ok(snapshot, `${label} must consume an actual sequence snapshot`);
        assert.equal(snapshot.kind, "sequence");
        assert.equal(snapshot.type, "snapshot");
        watches.get(watchId)!.cursor = snapshot.cursor;
        const serverWatchId = await waitForWatchLog(state.hostUtils, watchLogBaseline, "sequence", "acquired");
        watches.get(watchId)!.serverWatchId = serverWatchId;
        watchLogBaseline.add(serverWatchId);
        if (!acquiredId) acquiredId = serverWatchId;
        return { watchId, snapshot };
    };
    const closeWatch = async (watchId: string) => {
        await action(watchId, { action: "close" });
        const serverWatchId = watches.get(watchId)?.serverWatchId;
        assert.ok(serverWatchId, `watch ${watchId} must have an actual acquired server subscription`);
        await waitForWatchLog(state.hostUtils, watchLogBaseline, "sequence", "released", serverWatchId);
    };
    const receive = async (watchId: string, description: string, predicate: (event: Record<string, any>) => boolean): Promise<Record<string, any>> => {
        const deadline = Date.now() + 20_000;
        while (Date.now() < deadline) {
            const records = await history(watchId);
            const cursor = watches.get(watchId)!.cursor;
            const changes = records.filter(record => record.type === "change" && record.event?.type === "change" &&
                record.event?.kind === "sequence" && record.event?.cursor?.position > cursor.position)
                .sort((left, right) => left.event.cursor.position - right.event.cursor.position);
            for (const record of changes) {
                const event = record.event;
                assert.deepEqual(event.previousCursor, watches.get(watchId)!.cursor,
                    `${description}: sequence event linkage must advance through every observed sequence change`);
                assert.ok(event.cursor.position > watches.get(watchId)!.cursor.position);
                watches.get(watchId)!.cursor = event.cursor;
                if (predicate(event)) return event;
            }
            await new Promise(resolve => setTimeout(resolve, 25));
        }
        const recent = await history(watchId);
        assert.fail(`Timed out waiting for ${description}; latest actual sequence events=${JSON.stringify(recent.slice(-10).map(item => ({
            type: item.type, commandId: item.commandId, action: item.event?.action, instanceId: item.event?.instanceId,
            sequenceId: item.event?.sequenceId, revision: item.event?.manifestChange?.revision,
            previousRevision: item.event?.manifestChange?.previousRevision,
            cursor: item.event?.cursor, previousCursor: item.event?.previousCursor
        })))}`);
    };
    const producerAction = async (instance: InstanceClient, actionName: "update" | "finish"): Promise<any> => {
        const commandId = randomUUID();
        const eventName = actionName === "finish" ? "hub-watch-producer-finished" : `hub-watch-producer-receipt-${commandId}`;
        const pending = instance.getEvent(eventName);
        await instance.sendEvent("hub-watch-producer-action", JSON.stringify({ runId, commandId, action: actionName }));
        const result = eventData<{ runId: string; commandId: string; action?: string; receipt?: any }>(await pending);
        assert.equal(result.runId, runId);
        assert.equal(result.commandId, commandId);
        if (actionName === "update") assert.equal(result.action, actionName);
        return actionName === "update" ? result.receipt : result;
    };
    const assertReceiptEvent = (event: Record<string, any>, receipt: Record<string, any>, sequenceId: string, actionName: string) => {
        assert.equal(event.action, "manifest");
        assert.equal(event.sequenceId, sequenceId);
        assert.equal(event.instanceId, receipt.instanceId);
        assert.equal(event.manifestChange.action, actionName);
        assert.equal(event.manifestChange.sequenceId, sequenceId);
        assert.equal(event.manifestChange.instanceId, receipt.instanceId);
        assert.equal(event.manifestChange.revision, actionName === "removed" ? null : receipt.revision);
        if (actionName !== "removed") assert.ok(receipt.revision, `${actionName} receipt must include its real opaque revision`);
    };
    const snapshotManifests = async (label: string, sequenceId: string): Promise<Record<string, any>[]> => {
        const fresh = await open(label);
        const entry = fresh.snapshot.items.find((item: any) => item.id === sequenceId);
        assert.ok(entry, `fresh sequence snapshot must include producer sequence ${sequenceId}`);
        await closeWatch(fresh.watchId);
        return entry.manifests;
    };
    try {
        const observerArchive = resolveFixturePackagePath("data/sequences/bdd-packages/hub-event-watch-observer.tar.gz");
        const producerArchive = resolveFixturePackagePath("data/sequences/bdd-packages/hub-event-watch-producer.tar.gz");
        const observerSequence = await host.sendSequence(createReadStream(observerArchive));
        ownedSequences.push(observerSequence.id);
        observer = await observerSequence.start({ appConfig: { runId }, args: [] });
        const observerReady = eventData<{ runId: string; provenance: Record<string, any> }>(await observer.getEvent("hub-watch-observer-ready"));
        assert.equal(observerReady.runId, runId);
        assert.equal(observerReady.provenance.runtime?.name, "node");
        const selectedDist = realpathSync(join(state.artifacts.workspaceRoot, "dist"));
        for (const name of ["runner-node", "rest-api2", "api-router"] as const) {
            const path = observerReady.provenance.productModulePaths?.[name];
            assert.ok(path, `observer provenance omitted ${name}`);
            assert.ok(realpathSync(path).startsWith(`${selectedDist}${require("node:path").sep}`), `${name} resolved outside selected dist: ${path}`);
        }

        const baseline = new Set(watchLogRecords(state.hostUtils.output).map(record => record.watchId));
        for (const id of baseline) watchLogBaseline.add(id);
        const primaryWatch = await open("two-owner-manifest-events");
        const uploaded = await host.sendSequence(createReadStream(producerArchive));
        ownedSequences.push(uploaded.id);
        const initialReceipts: any[] = [];
        const readyProvenance: Record<string, any>[] = [];
        for (let index = 0; index < 2; index++) {
            const instance = await uploaded.start({ appConfig: { runId, topic: `multi-${runId}` }, args: [] });
            producers.push(instance);
            const ready = eventData<{ runId: string; receipt: any; provenance: Record<string, any> }>(await instance.getEvent("hub-watch-producer-ready"));
            assert.equal(ready.runId, runId);
            assert.ok(ready.receipt?.revision, `producer ${index} must publish a real initial manifest during initialization`);
            assert.equal(ready.receipt.sequenceId, uploaded.id);
            assert.equal(ready.receipt.instanceId, instance.id);
            initialReceipts.push(ready.receipt);
            readyProvenance.push(ready.provenance);
        }
        assert.notEqual(producers[0].id, producers[1].id, "the same uploaded sequence must have two distinct live instances");

        const events: any[] = [];
        for (let index = 0; index < 2; index++) {
            const event = await receive(primaryWatch.watchId, `initial manifest ${index}`, value => value.action === "manifest" &&
                value.instanceId === initialReceipts[index].instanceId && value.sequenceId === uploaded.id && value.manifestChange.action === "published");
            assertReceiptEvent(event, initialReceipts[index], uploaded.id, "published");
            events.push({ owner: index, operation: "published", revision: event.manifestChange.revision, cursor: event.cursor, previousCursor: event.previousCursor });
        }

        const initialSnapshot = await snapshotManifests("snapshot-both-published", uploaded.id);
        assert.equal(initialSnapshot.length, 2, "snapshot must label both simultaneously published instance manifests");
        for (const receipt of initialReceipts) {
            const item = initialSnapshot.find(manifest => manifest.instanceId === receipt.instanceId && manifest.sequenceId === uploaded.id);
            assert.ok(item, `snapshot omitted owner ${receipt.instanceId}`);
            assert.equal(item.revision, receipt.revision);
        }

        const updateReceipts: any[] = [];
        const updateSnapshots: Record<string, any>[][] = [];
        const currentRevisions = initialReceipts.map(receipt => receipt.revision);
        for (let index = 0; index < 2; index++) {
            const receipt = await producerAction(producers[index], "update");
            assert.equal(receipt.instanceId, initialReceipts[index].instanceId);
            assert.equal(receipt.sequenceId, uploaded.id);
            assert.notEqual(receipt.revision, initialReceipts[index].revision);
            const event = await receive(primaryWatch.watchId, `owner ${index} manifest update`, value => value.action === "manifest" &&
                value.instanceId === receipt.instanceId && value.sequenceId === uploaded.id && value.manifestChange.action === "updated" &&
                value.manifestChange.revision === receipt.revision);
            assertReceiptEvent(event, receipt, uploaded.id, "updated");
            assert.equal(event.manifestChange.previousRevision, initialReceipts[index].revision);
            updateReceipts.push(receipt);
            currentRevisions[index] = receipt.revision;
            events.push({ owner: index, operation: "updated", revision: event.manifestChange.revision, previousRevision: event.manifestChange.previousRevision,
                cursor: event.cursor, previousCursor: event.previousCursor });
            const snapshot = await snapshotManifests(`snapshot-after-update-${index}`, uploaded.id);
            assert.equal(snapshot.length, 2, "updating one owner must retain both instance manifests");
            for (let other = 0; other < 2; other++) {
                const item = snapshot.find(manifest => manifest.instanceId === initialReceipts[other].instanceId && manifest.sequenceId === uploaded.id);
                assert.ok(item, `update by owner ${index} removed owner ${other} from snapshot`);
                assert.equal(item.revision, currentRevisions[other],
                    `update by owner ${index} must not rewrite owner ${other}'s revision; actual=${JSON.stringify({
                        actor: { instanceId: receipt.instanceId, sequenceId: receipt.sequenceId, revision: receipt.revision },
                        unchangedOwner: { instanceId: initialReceipts[other].instanceId, sequenceId: initialReceipts[other].sequenceId,
                            expectedCurrentRevision: currentRevisions[other], initialRevision: initialReceipts[other].revision, snapshotRevision: item.revision },
                        snapshot: snapshot.map(value => ({ instanceId: value.instanceId, sequenceId: value.sequenceId, revision: value.revision }))
                    })}`);
            }
            updateSnapshots.push(snapshot.map(item => ({ instanceId: item.instanceId, sequenceId: item.sequenceId, revision: item.revision })));
        }

        const removalSnapshots: Record<string, any>[][] = [];
        for (let index = 0; index < 2; index++) {
            const finishReceipt = await producerAction(producers[index], "finish");
            assert.ok(typeof finishReceipt.commandId === "string", "finish must be acknowledged by the actual producer completion event");
            const priorRevision = updateReceipts[index].revision;
            const event = await receive(primaryWatch.watchId, `owner ${index} manifest removal`, value => value.action === "manifest" &&
                value.instanceId === initialReceipts[index].instanceId && value.sequenceId === uploaded.id && value.manifestChange.action === "removed");
            assert.equal(event.instanceId, initialReceipts[index].instanceId);
            assert.equal(event.sequenceId, uploaded.id);
            assert.equal(event.manifestChange.instanceId, initialReceipts[index].instanceId);
            assert.equal(event.manifestChange.sequenceId, uploaded.id);
            assert.equal(event.manifestChange.previousRevision, priorRevision);
            assert.equal(event.manifestChange.revision, null);
            assert.equal(event.manifestChange.manifest, null);
            events.push({ owner: index, operation: "removed", revision: null, previousRevision: event.manifestChange.previousRevision,
                cursor: event.cursor, previousCursor: event.previousCursor });
            const snapshot = await snapshotManifests(`snapshot-after-removal-${index}`, uploaded.id);
            assert.equal(snapshot.length, 1 - index, "removing one owner must preserve only the other owner's manifest");
            if (index === 0) {
                assert.equal(snapshot[0].instanceId, initialReceipts[1].instanceId);
                assert.equal(snapshot[0].sequenceId, uploaded.id);
                assert.equal(snapshot[0].revision, updateReceipts[1].revision,
                    "removing owner A must preserve owner B's updated manifest revision");
            }
            removalSnapshots.push(snapshot.map(item => ({ instanceId: item.instanceId, sequenceId: item.sequenceId, revision: item.revision })));
        }

        await closeWatch(primaryWatch.watchId);
        const released = await waitForWatchLog(state.hostUtils, baseline, "sequence", "released", acquiredId);
        releasedId = released;
        assert.equal(releasedId, acquiredId, "the actual primary sequence watch must release its acquired server subscription");
        const proof = {
            runId,
            sequenceId: uploaded.id,
            producerIds: [producers[0].id, producers[1].id],
            instanceIds: initialReceipts.map(receipt => receipt.instanceId),
            initialSnapshot: initialSnapshot.map(item => ({ instanceId: item.instanceId, sequenceId: item.sequenceId, revision: item.revision })),
            afterFirstUpdate: updateSnapshots[0],
            afterSecondUpdate: updateSnapshots[1],
            afterFirstRemoval: removalSnapshots[0],
            afterSecondRemoval: removalSnapshots[1],
            events,
            receipts: initialReceipts.map((receipt, index) => ({ owner: index, instanceId: receipt.instanceId, sequenceId: receipt.sequenceId, revision: receipt.revision }))
                .concat(updateReceipts.map((receipt, index) => ({ owner: index, instanceId: receipt.instanceId, sequenceId: receipt.sequenceId,
                    revision: receipt.revision, previousRevision: receipt.previousRevision }))),
            provenance: { observer: observerReady.provenance, producers: readyProvenance },
            acquiredId,
            releasedId
        };
        process.stdout.write(`[hub-event-watch.multi-instance-manifest] ${JSON.stringify(proof)}\n`);
        return proof;
    } finally {
        for (const watchId of watches.keys()) {
            try { await closeWatch(watchId); } catch { /* preserve primary failure; Host owns final teardown */ }
        }
        for (const instance of producers) {
            try {
                const completion = instance.getEvent("hub-watch-producer-finished");
                await instance.sendEvent("hub-watch-producer-action", JSON.stringify({ runId, commandId: randomUUID(), action: "finish" }));
                await settleWithin(completion, 3_000, `producer ${instance.id} cleanup finish acknowledgement`);
            } catch { /* already finished or Host teardown owns remaining process cleanup */ }
            try { await instance.stop(1_000, false); } catch { /* preserve primary proof outcome */ }
        }
        if (observer) {
            try {
                const completion = observer.getEvent("hub-watch-finished");
                await observer.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: randomUUID(), action: "finish" }));
                await settleWithin(completion, 3_000, "observer cleanup finish acknowledgement");
            } catch { /* Host teardown remains available */ }
            try { await observer.stop(1_000, false); } catch { /* preserve primary proof outcome */ }
        }
        for (const sequenceId of ownedSequences) {
            try { await host.deleteSequence(sequenceId); } catch { /* scenario isolation retains sequence ownership */ }
        }
        host.dispose();
    }
}

/** One real-container Bun-declared smoke: Bun starts the wrapper, which delegates the observer to Node. */
export async function proveHostedBunDelegatedWatch(world: WatchWorld): Promise<Record<string, any>> {
    const state = world.resources.runtimeManifestHost;
    assert.ok(state, "The configured DEBUG built Host must run before Bun-delegation proof");
    assert.ok(state.child.pid, "Owned Host process id is required for process ancestry verification");
    const runId = randomUUID();
    const { HostClient } = require(state.artifacts.modules.apiClient) as { HostClient: typeof HostClientType };
    const host = new HostClient(state.apiBaseUrl);
    let observer: InstanceClient | undefined;
    let sequenceId: string | undefined;
    const baseline = new Set(watchLogRecords(state.hostUtils.output).map(item => item.watchId));
    const command = (body: Record<string, unknown>) => observer!.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: randomUUID(), ...body }));
    const event = async <T>(name: string, send: () => Promise<unknown>): Promise<T> => eventData<T>(await (async () => {
        const pending = observer!.getEvent(name);
        await send();
        return pending;
    })());
    const history = async (watchId: string) => {
        const commandId = randomUUID();
        const pending = observer!.getEvent(`hub-watch-ack-${commandId}`);
        await command({ action: "ack", read: false, watchId, commandId });
        return eventData<{ history: Array<Record<string, any>> }>(await pending);
    };
    const waitFor = async (watchId: string, predicate: (record: Record<string, any>) => boolean) => {
        const deadline = Date.now() + 15_000;
        while (Date.now() < deadline) {
            const found = (await history(watchId)).history.find(predicate);
            if (found) return found;
            await new Promise(resolve => setTimeout(resolve, 30));
        }
        assert.fail(`Timed out waiting for Bun-declared observer record on ${watchId}`);
    };
    try {
        const archive = resolveFixturePackagePath("data/sequences/bdd-packages/hub-event-watch-bun-observer.tar.gz");
        const uploaded = await host.sendSequence(createReadStream(archive));
        sequenceId = uploaded.id;
        const { resolvePublishedModule } = require("./published-artifacts") as typeof import("./published-artifacts");
        const selectedModulePaths = Object.fromEntries(["host", "runner", "runner-bun", "runner-node", "rest-api2", "api-router", "adapter-process", "hub-state"].map(name => [name, resolvePublishedModule(`@scramjet/${name}`, { workspaceRoot: state.artifacts.workspaceRoot })]));
        observer = await uploaded.start({ appConfig: { runId, selectedModulePaths }, args: [] });
        const ready = eventData<{ runId: string; provenance: Record<string, any> }>(await observer.getEvent("hub-watch-observer-ready"));
        assert.equal(ready.runId, runId);
        const provenance = ready.provenance;
        assert.equal(provenance.declaredEngines?.bun, "1");
        assert.equal(provenance.runtime, "node", "Bun-declared smoke must report the actual Node-delegated runtime");
        assert.equal(provenance.execPath, process.execPath, "Node delegation must use the container's actual Node executable");
        assert.ok(provenance.nodeVersion?.startsWith("v"), "inner Node version is required");
        assert.equal(provenance.bunExecutable, "/opt/bun/bin/bun", "Bun version must be read from the image-owned executable");
        assert.equal(provenance.bunVersion, "1.4.2", "the supported BDD image's actual Bun version must be verified in-container");
        const fs = require("node:fs") as typeof import("node:fs");
        const path = require("node:path") as typeof import("node:path");
        const distRoot = fs.realpathSync(path.join(state.artifacts.workspaceRoot, "dist"));
        for (const name of ["host", "runner", "runner-bun", "runner-node", "rest-api2", "api-router", "adapter-process", "hub-state"]) {
            const selected = provenance.productModulePaths?.[name];
            assert.ok(selected, `Bun-declared fixture omitted selected ${name} module path`);
            assert.ok(fs.realpathSync(selected).startsWith(`${distRoot}${path.sep}`), `${name} resolved outside selected dist: ${selected}`);
        }
        assert.ok(provenance.productModulePaths.fixture?.endsWith("/index.js"), "fixture path must identify its uploaded entry");

        const watchId = `${runId}-bun-abort`;
        const openId = randomUUID();
        await command({ action: "open", kind: "topic", watchId, consume: true, signal: true, commandId: openId });
        const snapshot = await waitFor(watchId, record => record.type === "snapshot" && record.commandId === openId);
        assert.equal(snapshot.event.type, "snapshot");
        assert.equal(snapshot.event.kind, "topic");
        assert.ok(snapshot.event.cursor.hubId && snapshot.event.cursor.epoch);
        const acquiredId = await waitForWatchLog(state.hostUtils, baseline, "topic", "acquired");
        baseline.add(acquiredId);
        const pendingId = randomUUID();
        await command({ action: "pending-read", watchId, commandId: pendingId });
        const pendingReady = await waitFor(watchId, record => record.type === "pending-ready" && record.commandId === pendingId);
        assert.ok(pendingReady, "observer must record the real pending next() call");
        const terminalId = randomUUID();
        await command({ action: "abort", watchId, commandId: terminalId });
        const terminal = await waitFor(watchId, record => record.type === "closed" && record.commandId === terminalId);
        assert.equal(terminal.actualState, "aborted");
        assert.equal(terminal.pendingRead?.kind, "error");
        assert.equal(terminal.pendingRead?.error?.name, "AbortError");
        await waitForWatchLog(state.hostUtils, baseline, "topic", "released", acquiredId);
        console.log(`[hub-event-watch-bun.cleanup] ${JSON.stringify({ watchId: acquiredId, acquired: true, released: true, pendingRead: terminal.pendingRead, actualState: terminal.actualState })}`);
        const probeId = randomUUID();
        const probe = await event<{ status: number }>(`hub-watch-probe-${probeId}`, () => command({ action: "probe", commandId: probeId }));
        assert.equal(probe.status, 200);

        const finishId = randomUUID();
        const finished = await event<{ commandId: string }>("hub-watch-finished", () => command({ action: "finish", commandId: finishId }));
        assert.equal(finished.commandId, finishId);
        const lineage = provenance.processLineage as Array<{ pid: number; executable: string; entry: string }>;
        assert.ok(Array.isArray(lineage) && lineage.some(item => item.pid === state.child.pid), "observer process ancestry must reach the owned Host");
        assert.ok(lineage.some(item => item.executable.includes("/opt/bun/bin/bun")), "owned observer ancestry must include the real container Bun executable");
        assert.ok(lineage.some(item => item.entry.includes("/dist/runner-bun/")), "ancestry must include selected runner-bun entry");
        assert.ok(lineage.some(item => item.entry.includes("/dist/runner-node/")), "ancestry must include selected runner-node entry");
        assert.ok(lineage.some(item => item.entry.includes("/dist/runner/") && item.entry.includes("start-runner")), "ancestry must include selected outer runner entry");
        assert.equal(lineage[0].pid, provenance.pid);
        assert.equal(lineage[0].executable, realpathSync(provenance.execPath), "observer PID must execute the reported Node binary");
        assert.ok(lineage[0].entry.includes("/dist/runner-node/"), "observer itself must be the delegated Node runtime");
        console.log(`[hub-event-watch-bun.provenance] ${JSON.stringify({ declaredEngine: provenance.declaredEngines.bun, runtime: provenance.runtime, nodeVersion: provenance.nodeVersion, bunExecutable: provenance.bunExecutable, bunVersion: provenance.bunVersion, selectedModules: provenance.productModulePaths, lineage })}`);
        world.resources.hubWatchBunDelegationProof = { outcome: "AbortError", acquiredId, releasedId: acquiredId, probeStatus: probe.status, declaredEngine: provenance.declaredEngines.bun, runtime: provenance.runtime };
        return world.resources.hubWatchBunDelegationProof;
    } finally {
        if (observer) {
            try { await command({ action: "finish", commandId: randomUUID() }); } catch { /* preserve primary assertion */ }
            try { await observer.stop(1_000, false); } catch { /* Host teardown remains available */ }
        }
        if (sequenceId) { try { await host.deleteSequence(sequenceId); } catch { /* scenario teardown owns residual cleanup */ } }
        host.dispose();
    }
}

type StartupHealthFrame = {
    healthy: boolean;
    status: string;
    lifecycle: string;
    startupReady: boolean;
    cpm: { configured: boolean; connected: boolean };
    required: Array<{ key: string; sequenceId: string | null; instanceId: string | null; status: string | null; readiness: string; satisfied: boolean }>;
};

type StartupHealthWatch = {
    observer: InstanceClient;
    sequenceId: string;
    watchId: string;
    serverWatchId: string;
    cursor: { hubId: string; epoch: string; position: number };
    baseline: Set<string>;
};

function startupHealthFromRecord(record: Record<string, any>): StartupHealthFrame | undefined {
    if (record.type === "snapshot" && record.event?.type === "snapshot" && record.event?.kind === "health") return record.event.items?.[0];
    if (record.type === "change" && record.event?.type === "change" && record.event?.kind === "health" && record.event?.action === "upsert") return record.event.value;
    return undefined;
}

async function startupObserverAcknowledgement(observer: InstanceClient, runId: string, watchId: string): Promise<{ history: Array<Record<string, any>>; hasPendingRead: boolean }> {
    const commandId = randomUUID();
    const acknowledgement = observer.getEvent(`hub-watch-ack-${commandId}`);
    void acknowledgement.catch(() => undefined);
    try { await observer.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId, action: "ack", read: false, watchId })); }
    catch (error) { throw error; }
    const response = eventData<{ runId: string; commandId: string; watchId: string; history: Array<Record<string, any>>; hasPendingRead: boolean }>(await settleWithin(acknowledgement, 5_000, `observer acknowledgement ${commandId}`));
    assert.equal(response.runId, runId);
    assert.equal(response.commandId, commandId);
    assert.equal(response.watchId, watchId);
    return { history: response.history.filter(record => record.watchId === watchId), hasPendingRead: response.hasPendingRead };
}

async function startupObserverHistory(observer: InstanceClient, runId: string, watchId: string): Promise<Array<Record<string, any>>> {
    return (await startupObserverAcknowledgement(observer, runId, watchId)).history;
}

async function waitForStartupObserverRecord(
    observer: InstanceClient,
    runId: string,
    watchId: string,
    predicate: (record: Record<string, any>) => boolean,
    timeoutMs: number,
    description: string
): Promise<Record<string, any>> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const history = await settleWithin(startupObserverHistory(observer, runId, watchId), 5_000, `${description} history poll`);
        const record = history.find(predicate);
        if (record) return record;
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    const recent = await startupObserverHistory(observer, runId, watchId);
    assert.fail(`Timed out waiting for ${description}; recent observer records=${JSON.stringify(recent.slice(-8).map(record => ({ type: record.type, commandId: record.commandId, eventType: record.event?.type, kind: record.event?.kind, health: startupHealthFromRecord(record) })))}`);
}

async function openStartupHealthWatch(host: HostClientType, state: WatchHostState, runId: string): Promise<StartupHealthWatch> {
    const archive = resolveFixturePackagePath("data/sequences/bdd-packages/hub-event-watch-observer.tar.gz");
    const observerSequence = await host.sendSequence(createReadStream(archive));
    let observer: InstanceClient;
    try {
        observer = await observerSequence.start({ appConfig: { runId }, args: [] });
    } catch (error) {
        try { await host.deleteSequence(observerSequence.id); } catch { /* retain startup failure */ }
        throw error;
    }
    const ready = eventData<{ runId: string; provenance: Record<string, any> }>(await observer.getEvent("hub-watch-observer-ready"));
    assert.equal(ready.runId, runId);
    assert.equal(ready.provenance.runtime?.name, "node");
    const selectedDist = realpathSync(join(state.artifacts.workspaceRoot, "dist"));
    for (const name of ["runner-node", "rest-api2", "api-router"] as const) {
        const path = ready.provenance.productModulePaths?.[name];
        assert.ok(path, `health observer provenance omitted ${name}`);
        const resolved = realpathSync(path);
        assert.ok(resolved.startsWith(`${selectedDist}${require("node:path").sep}`), `${name} resolved outside selected worktree dist: ${resolved}`);
    }
    const baseline = new Set(watchLogRecords(state.hostUtils.output).map(record => record.watchId));
    const watchId = `${runId}-required-health`;
    const openCommandId = randomUUID();
    await observer.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: openCommandId, action: "open", kind: "health", watchId, consume: true }));
    const initial = await waitForStartupObserverRecord(observer, runId, watchId, record => record.type === "snapshot" && record.commandId === openCommandId, 20_000, "actual health snapshot");
    assert.equal(initial.event.kind, "health");
    assert.ok(initial.event.cursor?.hubId && initial.event.cursor?.epoch);
    const acquiredId = await waitForWatchLog(state.hostUtils, baseline, "health", "acquired");
    baseline.add(acquiredId);
    return { observer, sequenceId: observerSequence.id, watchId, serverWatchId: acquiredId, cursor: initial.event.cursor, baseline };
}

async function startStartupHealthRead(watch: StartupHealthWatch, runId: string): Promise<string> {
    const commandId = randomUUID();
    await watch.observer.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId, action: "pending-read", watchId: watch.watchId }));
    await waitForStartupObserverRecord(watch.observer, runId, watch.watchId, record => record.type === "pending-ready" && record.commandId === commandId, 10_000, "observer's real pending next() read");
    return commandId;
}

async function settleStartupHealthRead(watch: StartupHealthWatch, runId: string, commandId: string, timeoutMs = 20_000): Promise<{ record: Record<string, any>; value: StartupHealthFrame }> {
    const record = await waitForStartupObserverRecord(
        watch.observer,
        runId,
        watch.watchId,
        item => item.commandId === commandId && (item.type === "change" || item.type === "error" || item.type === "complete"),
        timeoutMs,
        `health next() settlement for ${commandId}`
    );
    assert.equal(record.type, "change", `health next() settled unexpectedly: ${JSON.stringify(record)}`);
    assert.equal(record.event?.kind, "health");
    assert.deepEqual(record.event.previousCursor, watch.cursor, "actual health event linkage must continue the prior observed cursor");
    assert.ok(record.event.cursor.position > watch.cursor.position, "actual health event cursor must advance");
    watch.cursor = record.event.cursor;
    const value = startupHealthFromRecord(record);
    assert.ok(value, "actual health change must carry a health upsert value");
    return { record, value };
}

async function readUntilStartupHealth(
    watch: StartupHealthWatch,
    runId: string,
    predicate: (health: StartupHealthFrame) => boolean,
    timeoutMs: number,
    startingReadId?: string
): Promise<{ health: StartupHealthFrame; states: StartupHealthFrame[] }> {
    const deadline = Date.now() + timeoutMs;
    const states: StartupHealthFrame[] = [];
    let readId = startingReadId;
    while (Date.now() < deadline) {
        readId ||= await startStartupHealthRead(watch, runId);
        const remaining = Math.max(1, deadline - Date.now());
        const settled = await settleStartupHealthRead(watch, runId, readId, remaining);
        readId = undefined;
        states.push(settled.value);
        if (predicate(settled.value)) return { health: settled.value, states };
    }
    assert.fail(`Timed out waiting for required-startup health; observed states=${JSON.stringify(states)}`);
}

async function closeStartupHealthWatch(state: WatchHostState, watch: StartupHealthWatch, runId: string): Promise<Record<string, any>> {
    const commandId = randomUUID();
    await watch.observer.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId, action: "close", watchId: watch.watchId }));
    const closed = await waitForStartupObserverRecord(watch.observer, runId, watch.watchId, record => record.type === "closed" && record.commandId === commandId, 10_000, "graceful health watch close");
    assert.equal(closed.reason, "closed");
    assert.equal(closed.actualState, "closed");
    assert.ok(closed.pendingRead === null || (closed.pendingRead?.kind === "done" && closed.pendingRead.done === true),
        "watch close must settle any actual pending read as done; no pending read is valid after the observed recovery event");
    await waitForWatchLog(state.hostUtils, watch.baseline, "health", "released", watch.serverWatchId);
    return closed;
}

async function setStartupTestLogLevel(state: WatchHostState, logLevel: "INFO" | "DEBUG"): Promise<void> {
    const response = await fetch(`${new URL(state.apiBaseUrl).origin}/api/v2/log-level`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ logLevel })
    });
    assert.equal(response.status, 200, `existing Host log-level route rejected ${logLevel}`);
    await response.arrayBuffer();
}

async function waitForValue<T>(check: () => Promise<T>, predicate: (value: T) => boolean, timeoutMs: number, description: string): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;
    while (Date.now() < deadline) {
        try {
            const value = await check();
            if (predicate(value)) return value;
        } catch (error) { lastError = error; }
        await new Promise(resolve => setTimeout(resolve, 30));
    }
    assert.fail(`Timed out waiting for ${description}${lastError instanceof Error ? `: ${lastError.message}` : ""}`);
}

function writeOwnedGateRelease(path: string): void {
    mkdirSync(require("node:path").dirname(path), { recursive: true, mode: 0o700 });
    writeFileSync(path, "released\n", { mode: 0o600 });
}

async function finishStartupObserver(watch: StartupHealthWatch, runId: string, host: HostClientType): Promise<void> {
    const finishedEvent = watch.observer.getEvent("hub-watch-finished");
    void finishedEvent.catch(() => undefined);
    await watch.observer.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: randomUUID(), action: "finish" }));
    const finished = eventData<{ runId: string }>(await finishedEvent);
    assert.equal(finished.runId, runId);
    await watch.observer.stop(1_000, false);
    await host.deleteSequence(watch.sequenceId);
}

async function settleWithin<T>(promise: Promise<T>, timeoutMs: number, description: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${description} exceeded ${timeoutMs}ms`)), timeoutMs); })
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/** Actual fully-started Host retains an unresolved declared obligation while legacy ready is true. */
export async function proveHostedMissingRequiredStartupHealth(world: WatchWorld): Promise<Record<string, any>> {
    const isolation = world.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must own the missing-startup config");
    const runId = randomUUID();
    const missingSequenceId = `missing-${randomUUID()}`;
    const startupConfigPath = join(isolation.artifactsDir, `startup-missing-${runId}.json`);
    const { HostClient } = require(startupManifestArtifacts().modules.apiClient) as { HostClient: typeof HostClientType };
    let host: HostClientType | undefined;
    let watch: StartupHealthWatch | undefined;
    try {
        const state = await startManifestHost(world, "built", configuration => {
            configuration.logLevel = "INFO";
            configuration.logColors = false;
            configuration.startupConfig = startupConfigPath;
            writeFileSync(startupConfigPath, JSON.stringify({ sequences: [{ id: missingSequenceId, required: true, restartLimit: 0 }] }), { mode: 0o600 });
        });
        host = new HostClient(state.apiBaseUrl);
        assert.equal((await host.getStatus()).ready, true, "legacy Host readiness must be true after missing startup selectors are skipped");
        await setStartupTestLogLevel(state, "DEBUG");
        watch = await openStartupHealthWatch(host, state, runId);
        const snapshot = (await startupObserverHistory(watch.observer, runId, watch.watchId)).find(record => record.type === "snapshot")?.event;
        assert.ok(snapshot, "hosted Node observer must retain its actual initial health snapshot");
        const health = snapshot.items?.[0] as StartupHealthFrame | undefined;
        assert.ok(health, "health snapshot must contain the public Hub health value");
        assert.equal(health.lifecycle, "running");
        assert.equal(health.startupReady, true);
        assert.equal(health.healthy, false);
        assert.equal(health.status, "unhealthy");
        assert.deepEqual(health.cpm, { configured: false, connected: false });
        assert.deepEqual(health.required, [{ key: "startup:0", sequenceId: null, instanceId: null, status: null, readiness: "missing", satisfied: false }]);
        assert.deepEqual(Object.keys(health.required[0]).sort(), ["instanceId", "key", "readiness", "satisfied", "sequenceId", "status"].sort());
        const publicHealth = JSON.stringify(health);
        assert.ok(!publicHealth.includes(missingSequenceId), "missing selector must not leak into watch health");
        assert.ok(!publicHealth.includes(startupConfigPath), "private startup file path must not leak into watch health");
        const pendingReadId = await startStartupHealthRead(watch, runId);
        const hostStatus = await host.getStatus();
        assert.equal(hostStatus.ready, true, "legacy readiness remains true while the new watch correctly reports unhealthy");
        await closeStartupHealthWatch(state, watch, runId);
        await setStartupTestLogLevel(state, "INFO");
        const result = { health, legacyReady: hostStatus.ready, watchId: watch.watchId, acquiredId: watch.serverWatchId, released: true, pendingReadId };
        await finishStartupObserver(watch, runId, host);
        watch = undefined;
        console.log(`[hub-event-watch-required-health.missing] ${JSON.stringify(result)}`);
        world.resources.hubWatchRequiredHealthResult = { kind: "missing", ...result };
        return world.resources.hubWatchRequiredHealthResult;
    } finally {
        if (watch) {
            try { if (world.resources.runtimeManifestHost) await setStartupTestLogLevel(world.resources.runtimeManifestHost, "INFO"); } catch { /* preserve proof failure */ }
            try { await finishStartupObserver(watch, runId, host!); } catch { /* Host teardown remains available */ }
        }
        host?.dispose();
    }
}

function startupManifestArtifacts(): ManifestProofArtifacts {
    return resolveManifestProofArtifacts("built", { workspaceRoot: resolve(__dirname, "../..") });
}

/** Startup-gated P3 producer proves real READY, legacy-ready preservation, and existing supervised restart. */
export async function proveHostedRequiredStartupReadinessAndRestart(world: WatchWorld): Promise<Record<string, any>> {
    const isolation = world.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must own startup config, seeded fixture and gate release files");
    const runId = randomUUID();
    const sequenceId = randomUUID();
    const gateId = runId;
    const startupConfigPath = join(isolation.artifactsDir, `startup-gated-${runId}.json`);
    const gateFileName = `gate-${randomUUID()}.release`;
    let gatePath = "";
    const fixtureSource = realpathSync(resolve(__dirname, "../data/sequences/bdd-hub-event-watch-producer"));
    const { HostClient } = require(startupManifestArtifacts().modules.apiClient) as { HostClient: typeof HostClientType };
    let host: HostClientType | undefined;
    let startupPromise: Promise<WatchHostState> | undefined;
    let watch: StartupHealthWatch | undefined;
    let producerInstance: InstanceClient | undefined;
    let initialGatePid: number | undefined;
    let replacementGatePid: number | undefined;
    const fixtureDir = (sequencePath: string) => join(sequencePath, sequenceId);
    const startupInstanceName = `required-${randomUUID()}`;
    try {
        let resolvePrepared!: (context: import("./runtime-manifest-host").ManifestHostConfigureContext) => void;
        let rejectPrepared!: (error: unknown) => void;
        const prepared = new Promise<import("./runtime-manifest-host").ManifestHostConfigureContext>((resolvePreparedContext, rejectPreparedContext) => {
            resolvePrepared = resolvePreparedContext;
            rejectPrepared = rejectPreparedContext;
        });
        startupPromise = startManifestHost(world, "built", async (configuration, context) => {
            configuration.logLevel = "INFO";
            configuration.logColors = false;
            configuration.identifyExisting = true;
            const destination = fixtureDir(context.sequencePath);
            mkdirSync(context.sequencePath, { recursive: true, mode: 0o700 });
            cpSync(fixtureSource, destination, { recursive: true, errorOnExist: true, force: false });
            assert.ok(existsSync(join(destination, "package.json")) && existsSync(join(destination, "index.js")), "full registered producer fixture must be seeded before Host spawn");
            gatePath = join(destination, gateFileName);
            const startup = {
                sequences: [{
                    id: sequenceId,
                    required: true,
                    restartLimit: 1,
                    instanceName: startupInstanceName,
                    appConfig: { runId, publish: false, initializeGatePath: gateFileName },
                    args: []
                }]
            };
            configuration.startupConfig = startupConfigPath;
            writeFileSync(startupConfigPath, JSON.stringify(startup), { mode: 0o600 });
            resolvePrepared(context);
        });
        // Attach rejection handling immediately: the Host intentionally remains in required startup until gate release.
        void startupPromise.catch(error => rejectPrepared(error));
        const context = await prepared;
        host = new HostClient(context.apiBaseUrl);
        await Promise.race([
            waitForValue(() => host!.getStatus(), status => Boolean(status), 15_000, "real Host API availability during blocked startup"),
            startupPromise.then(() => { throw new Error("required Host startup unexpectedly completed before its initialized sequence gate released"); })
        ]);

        const firstOwner = await waitForValue(
            () => host!.listInstances(),
            instances => instances.some(instance => instance.instanceName === startupInstanceName && instance.sequence?.id === sequenceId),
            20_000,
            "real required producer PING/instance registration"
        ).then(instances => instances.find(instance => instance.instanceName === startupInstanceName && instance.sequence?.id === sequenceId)!);
        const firstInstanceId = firstOwner.id;
        producerInstance = host.getInstanceClient(firstInstanceId);
        const firstGateEvent = eventData<{ runId: string; gateId: string; pid: number; instanceId: string; nodeVersion: string }>(await producerInstance.getEvent("hub-watch-producer-gate-entered"));
        assert.equal(firstGateEvent.runId, runId);
        assert.equal(firstGateEvent.gateId, gateId);
        assert.equal(firstGateEvent.instanceId, firstInstanceId);
        assert.ok(firstGateEvent.pid > 0 && firstGateEvent.nodeVersion.startsWith("v"));
        initialGatePid = firstGateEvent.pid;
        process.stdout.write(`[hub-event-watch-required-health.gate] ${JSON.stringify({ phase: "initial-entered", instanceId: firstInstanceId, pid: initialGatePid, nodeVersion: firstGateEvent.nodeVersion })}\n`);

        const state = world.resources.runtimeManifestHost;
        assert.ok(state, "Host must have been spawned while startup remains gated");
        await setStartupTestLogLevel(state, "DEBUG");
        watch = await openStartupHealthWatch(host, state, runId);
        const snapshotRecord = (await startupObserverHistory(watch.observer, runId, watch.watchId)).find(record => record.type === "snapshot");
        assert.ok(snapshotRecord, "hosted observer must consume the actual health snapshot while required initialize is gated");
        const pendingHealth = startupHealthFromRecord(snapshotRecord);
        assert.ok(pendingHealth);
        const pendingEntry = pendingHealth.required.find(entry => entry.key === "startup:0");
        assert.ok(pendingEntry);
        assert.equal(pendingHealth.startupReady, false);
        assert.equal(pendingHealth.healthy, false);
        assert.equal(pendingHealth.status, "unhealthy");
        assert.equal(pendingEntry.sequenceId, sequenceId);
        assert.equal(pendingEntry.instanceId, firstInstanceId);
        assert.ok(["starting", "running"].includes(pendingEntry.status || ""), "actual current owner status must remain observable while readiness is pending");
        assert.equal(pendingEntry.readiness, "pending");
        assert.equal(pendingEntry.satisfied, false);
        const initialHealthText = JSON.stringify(pendingHealth);
        assert.ok(!initialHealthText.includes(gatePath), "private initialization gate path must not appear in public watch health");
        assert.ok(!initialHealthText.includes(startupConfigPath), "private startup configuration path must not appear in public watch health");
        let pendingReadId = await startStartupHealthRead(watch, runId);
        const readState = await startupObserverAcknowledgement(watch.observer, runId, watch.watchId);
        assert.equal(readState.hasPendingRead, true, "observer must report its actual pending health read before release");
        // Switch to INFO before READY; Host's existing debug startup-config dump must not print the private gate path.
        await setStartupTestLogLevel(state, "INFO");
        writeOwnedGateRelease(gatePath);
        await startupPromise;
        assert.equal((await host.getStatus()).ready, true, "legacy startupReady becomes true only after actual READY");
        const firstReady = await readUntilStartupHealth(watch, runId, health => {
            const entry = health.required.find(required => required.key === "startup:0");
            return health.lifecycle === "running" && health.startupReady && health.healthy && health.status === "healthy" && Boolean(entry?.satisfied && entry.readiness === "ready" && entry.status === "running");
        }, 20_000, pendingReadId);
        pendingReadId = "";
        process.stdout.write(`[hub-event-watch-required-health.gate] ${JSON.stringify({ phase: "initial-ready", status: firstReady.health.required[0].status, readiness: firstReady.health.required[0].readiness, satisfied: firstReady.health.required[0].satisfied, startupReady: firstReady.health.startupReady })}\n`);

        // The actual producer main completes. Remove the first gate before finish so its supervised replacement blocks.
        unlinkSync(gatePath);
        const finishCommandId = randomUUID();
        const producerFinishedEvent = producerInstance.getEvent("hub-watch-producer-finished");
        await producerInstance.sendEvent("hub-watch-producer-action", JSON.stringify({ runId, commandId: finishCommandId, action: "finish" }));
        const producerFinished = eventData<{ runId: string; commandId: string }>(await producerFinishedEvent);
        assert.equal(producerFinished.runId, runId);
        assert.equal(producerFinished.commandId, finishCommandId);
        process.stdout.write(`[hub-event-watch-required-health.gate] ${JSON.stringify({ phase: "initial-finished", instanceId: firstInstanceId })}\n`);
        try { await settleWithin(host.getStatus(), 5_000, "Host status after initial producer finish"); }
        catch (error) {
            const diagnostics = state.hostUtils.output.split(/\r?\n/).filter(line => /Restarting required startup entry|exhausted restartLimit|Received kill signal|Host running!/.test(line)).slice(-12);
            process.stdout.write(`[hub-event-watch-required-health.restart-diagnostic] ${JSON.stringify({ exitCode: state.child.exitCode, signalCode: state.child.signalCode, matchedHostLines: diagnostics })}\n`);
            throw error;
        }

        pendingReadId = await startStartupHealthRead(watch, runId);
        const unsatisfied = await readUntilStartupHealth(watch, runId, health => {
            const entry = health.required.find(required => required.key === "startup:0");
            return Boolean(entry && !entry.satisfied && entry.sequenceId === sequenceId && entry.instanceId === firstInstanceId &&
                (entry.readiness === "missing" || entry.readiness === "pending" || entry.readiness === "errored"));
        }, 20_000, pendingReadId);
        const unsatisfiedEntry = unsatisfied.health.required.find(entry => entry.key === "startup:0");
        assert.ok(unsatisfiedEntry && !unsatisfiedEntry.satisfied);
        process.stdout.write(`[hub-event-watch-required-health.gate] ${JSON.stringify({ phase: "owner-unsatisfied", status: unsatisfiedEntry.status, readiness: unsatisfiedEntry.readiness, satisfied: unsatisfiedEntry.satisfied })}\n`);

        const currentGateEvent = await waitForValue(async () => {
            const current = host!.getInstanceClient(firstInstanceId);
            const gate = eventData<{ pid: number; instanceId: string; gateId: string; runId: string }>(await current.getEvent("hub-watch-producer-gate-entered"));
            return { currentId: firstInstanceId, event: gate };
        }, value => Boolean(value.event?.pid && value.event.pid !== initialGatePid && value.event.gateId === gateId), 25_000, "real supervised required-instance replacement initialization gate");
        replacementGatePid = currentGateEvent.event.pid;
        process.stdout.write(`[hub-event-watch-required-health.gate] ${JSON.stringify({ phase: "replacement-entered", instanceId: currentGateEvent.currentId, pid: replacementGatePid })}\n`);
        assert.equal(currentGateEvent.currentId, firstInstanceId, "required restart preserves its stable instance id");
        assert.equal(currentGateEvent.event.instanceId, firstInstanceId);
        assert.notEqual(replacementGatePid, initialGatePid, "replacement must be a distinct real producer process");

        const replacementPendingRecord = (await startupObserverHistory(watch.observer, runId, watch.watchId))
            .filter(record => record.type === "change")
            .map(record => ({ record, health: startupHealthFromRecord(record) }))
            .find(({ health }) => {
                const entry = health?.required.find(required => required.key === "startup:0");
                return Boolean(entry && entry.instanceId === firstInstanceId && (entry.status === "starting" || entry.status === "running") &&
                    entry.readiness === "pending" && !entry.satisfied);
            });
        assert.ok(replacementPendingRecord, "actual observed health history must contain the replacement's pending unsatisfied owner");
        const replacementPending = { record: replacementPendingRecord.record, health: replacementPendingRecord.health! };
        const replacementEntry = replacementPending.health.required.find(entry => entry.key === "startup:0");
        assert.ok(replacementEntry);
        assert.equal(replacementEntry.instanceId, firstInstanceId);
        assert.ok(["starting", "running"].includes(replacementEntry.status || ""), "replacement status must remain the actual observed status");
        assert.equal(replacementEntry.readiness, "pending", "old READY must not make the new current owner satisfied");
        assert.equal(replacementEntry.satisfied, false);
        const legacyReadyDuringRestart = await host.getStatus();
        assert.equal(legacyReadyDuringRestart.ready, true, "existing legacy ready flag remains true through supervised restart");

        pendingReadId = await startStartupHealthRead(watch, runId);
        writeOwnedGateRelease(gatePath);
        const recovered = await readUntilStartupHealth(watch, runId, health => {
            const entry = health.required.find(required => required.key === "startup:0");
            return Boolean(health.lifecycle === "running" && health.startupReady && health.healthy && health.status === "healthy" && entry?.instanceId === firstInstanceId && entry.satisfied && entry.readiness === "ready" && entry.status === "running");
        }, 20_000, pendingReadId);
        const legacyReadyAfterRecovery = await host.getStatus();
        assert.equal(legacyReadyAfterRecovery.ready, true);
        await setStartupTestLogLevel(state, "DEBUG");
        const closed = await closeStartupHealthWatch(state, watch, runId);
        const completedWatch = watch;
        await finishStartupObserver(completedWatch, runId, host);
        watch = undefined;
        const result = {
            sequenceId,
            instanceId: firstInstanceId,
            initial: pendingHealth,
            initialHealthy: firstReady.health,
            unsatisfiedDuringRestart: unsatisfied.health,
            replacementPending: replacementPending.health,
            recovered: recovered.health,
            pids: { initial: initialGatePid, replacement: replacementGatePid },
            legacyReady: { afterReady: true, duringRestart: legacyReadyDuringRestart.ready, afterRecovery: legacyReadyAfterRecovery.ready },
            watchId: completedWatch.watchId,
            acquiredId: completedWatch.serverWatchId,
            closed: { actualState: closed.actualState, pendingRead: closed.pendingRead, released: true }
        };
        console.log(`[hub-event-watch-required-health.gated-restart] ${JSON.stringify(result)}`);
        world.resources.hubWatchRequiredHealthResult = { kind: "gated-restart", ...result };
        return world.resources.hubWatchRequiredHealthResult;
    } finally {
        if (gatePath && !existsSync(gatePath)) {
            try { writeOwnedGateRelease(gatePath); } catch { /* cleanup continues to observer and Host */ }
        }
        if (startupPromise) {
            try { await settleWithin(startupPromise, 30_000, "startup cleanup wait"); } catch { /* Host After hook owns residual shutdown */ }
        }
        const state = world.resources.runtimeManifestHost;
        if (watch) {
            if (state) {
                try { await setStartupTestLogLevel(state, "DEBUG"); } catch { /* preserve proof failure */ }
                try { await closeStartupHealthWatch(state, watch, runId); } catch { /* Host shutdown remains available */ }
            }
            try { await finishStartupObserver(watch, runId, host!); } catch { /* Host teardown remains available */ }
        }
        host?.dispose();
    }
}
