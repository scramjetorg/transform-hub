import { After, Then, When } from "@cucumber/cucumber";
import { CustomWorld } from "../world";

import { HostClient, InstanceClient } from "@scramjet/api-client";
import { defaultConfig } from "@scramjet/config";
import Dockerode = require("dockerode");

import { strict as assert } from "assert";
import { ChildProcess } from "child_process";
import { SIGTERM } from "constants";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import * as net from "net";
import { defer, waitForCondition, waitUntilStreamEquals } from "../../lib/utils";
import { promisify } from "util";
import { readFile, unlink, writeFile } from "fs/promises";
import { readFileSync } from "fs";
import { HostUtils } from "../../lib/host-utils";

const freeport = promisify(require("freeport"));
const procClockTicksPerSecond = 100;

type HubMetrics = {
    label: string;
    durationMs: number;
    cpuTimeMs: number;
    rssBytes: number;
    peakRssBytes: number;
};

function readHubMetrics(pid: number): { cpuTimeMs: number; rssBytes: number; peakRssBytes: number } | undefined {
    try {
        // Read only while the process is alive.  A disappearing /proc entry is
        // deliberately treated as an unavailable sample, never as an exit sample.
        process.kill(pid, 0);
        const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
        const status = readFileSync(`/proc/${pid}/status`, "utf8");
        const statEnd = stat.lastIndexOf(")");
        const fields = stat.slice(statEnd + 2).trim().split(/\s+/);
        const userTicks = Number(fields[11]);
        const systemTicks = Number(fields[12]);
        const rssMatch = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);
        const peakMatch = status.match(/^VmHWM:\s+(\d+)\s+kB$/m);
        if (!Number.isFinite(userTicks) || !Number.isFinite(systemTicks) || !rssMatch || !peakMatch) return undefined;
        return {
            cpuTimeMs: (userTicks + systemTicks) * 1000 / procClockTicksPerSecond,
            rssBytes: Number(rssMatch[1]) * 1024,
            peakRssBytes: Number(peakMatch[1]) * 1024
        };
    } catch {
        return undefined;
    }
}

async function captureHubMetrics(world: CustomWorld, label: string): Promise<void> {
    const hub = world.resources.hub as ChildProcess | undefined;
    if (!hub?.pid) assert.fail("Hub process not found");

    const startedAt = Date.now();
    let first: ReturnType<typeof readHubMetrics>;
    let last: ReturnType<typeof readHubMetrics>;
    let peakRssBytes = 0;
    const sample = () => {
        const metrics = readHubMetrics(hub.pid!);
        if (!metrics) return;
        first ??= metrics;
        last = metrics;
        peakRssBytes = Math.max(peakRssBytes, metrics.rssBytes, metrics.peakRssBytes);
    };
    sample();
    assert.strictEqual(hub.exitCode, null, `${label} Hub exited before metrics capture began`);
    // Mark the deliberate auto-exit as expected before waiting, so the
    // scenario-lifecycle After hook does not flag it as a spontaneous exit.
    world.scenarioLifecycle.expect(hub);
    await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
        const timer = setInterval(sample, 50);
        const timeout = setTimeout(() => {
            clearInterval(timer);
            reject(new Error(`Hub did not auto-exit during ${label} metrics capture`));
        }, 30000);
        hub.once("exit", (code, signal) => {
            clearInterval(timer);
            clearTimeout(timeout);
            resolve({ code, signal });
        });
    });
    const exit = world.resources.hubExit as { code: number | null } | undefined;
    const final = last ?? first;
    assert.ok(first && final, `No /proc metrics sampled while Hub was alive for ${label} run`);
    assert.strictEqual(exit?.code, 0, `${label} Hub exited unexpectedly`);
    const metrics: HubMetrics = {
        label,
        durationMs: Date.now() - startedAt,
        cpuTimeMs: final.cpuTimeMs,
        rssBytes: final.rssBytes,
        peakRssBytes
    };
    world.resources.hubMetrics ??= {};
    world.resources.hubMetrics[label] = metrics;
    console.log(`HUB_IAC_METRICS ${JSON.stringify(metrics)}`);
    spawned.delete(hub);
    restoreSavedHostEnv(world.resources);
}


const spawned: Set<ChildProcess> = new Set();

process.on("exit", () => {
    spawned.forEach(child => {
        try {
            HostUtils.killProcessGroup(child, SIGTERM, 10000);
        } catch {
            console.error(`Had problems killing PID: ${child.pid}`);
        }
    });
});

const occupiedServers: net.Server[] = [];

process.on("exit", () => {
    occupiedServers.forEach(server => server.close());
});

// Scenario-scoped teardown: if a "port {int} is occupied" step created a
// server but the scenario failed or ended before an explicit release step,
// close the server here.  This prevents resource leaks that would block
// subsequent scenarios or leave dangling listeners on the port.
After(async function (this: CustomWorld) {
    const server = this.resources.portOccupier as net.Server | undefined;
    const occupiedByUs = this.resources.portOccupiedByUs as boolean | undefined;

    if (server && occupiedByUs) {
        const idx = occupiedServers.indexOf(server);

        if (idx >= 0) occupiedServers.splice(idx, 1);
        await new Promise<void>(resolve => server.close(() => resolve()));
    }

    delete this.resources.portOccupier;
    delete this.resources.portOccupiedByUs;
});

When("port {int} is occupied", async function(this: CustomWorld, port: number) {
    const server = net.createServer();
    try {
        await new Promise<void>((resolve, reject) => {
            server.once("error", reject);
            server.listen(port, "127.0.0.1", () => {
                occupiedServers.push(server);
                this.resources.portOccupier = server;
                this.resources.portOccupiedByUs = true;
                resolve();
            });
        });
    } catch (err: any) {
        // Port may already be occupied by the suite host (NO_HOST=false).
        // That is fine — the port is still occupied, just not by us.
        if (err.code === "EADDRINUSE") {
            console.error(`Port ${port} already occupied (suite host?) — using existing occupancy.`);
            this.resources.portOccupier = undefined;
            this.resources.portOccupiedByUs = false;
            return;
        }
        throw err;
    }
});

When("the occupied port is released", async function(this: CustomWorld) {
    const server = this.resources.portOccupier as net.Server | undefined;
    const occupiedByUs = this.resources.portOccupiedByUs as boolean | undefined;
    if (!server || !occupiedByUs) {
        // If we did not occupy the port ourselves, there is nothing to close.
        delete this.resources.portOccupier;
        delete this.resources.portOccupiedByUs;
        return;
    }
    const idx = occupiedServers.indexOf(server);
    if (idx >= 0) occupiedServers.splice(idx, 1);
    await new Promise<void>(resolve => server.close(() => resolve()));
    delete this.resources.portOccupier;
    delete this.resources.portOccupiedByUs;
});

async function startHubWithParams(world: CustomWorld, params: string[], noDefaultPorts: boolean = false) {
    const { resources } = world;
    const hostUtils = new HostUtils();
    // @starts-host scenarios must launch their requested Hub even when the
    // suite host URL is present in the environment.  HostUtils otherwise
    // treats that URL as an external-host shortcut and never owns a child.
    hostUtils.hostUrl = "";
    const expectedHubExitCode = resources.expectedHubExitCode as number | undefined;
    const runnerHostPortEnv = "SCRAMJET_VERSER2_RUNNER_HOST_BIND_PORT";
    const runnerHostEnabledEnv = "SCRAMJET_VERSER2_RUNNER_HOST_ENABLED";
    const runnerHostPublicUrlEnv = "SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL";
    const savedRunnerHostPort = process.env[runnerHostPortEnv];
    const savedRunnerHostEnabled = process.env[runnerHostEnabledEnv];
    const savedRunnerHostPublicUrl = process.env[runnerHostPublicUrlEnv];

    // The suite's BeforeAll host owns the default runner verser2 port (2445).
    // Scenario hubs must not inherit that fixed port, otherwise the second
    // scenario-spawned Hub exits before "Host running!" with EADDRINUSE.
    if (!params.some(param => param.startsWith("--verser2-runner-host-bind-port"))) {
        process.env[runnerHostEnabledEnv] = "true";
        const allocatedPort = String(await freeport());

        process.env[runnerHostPortEnv] = allocatedPort;
        process.env[runnerHostPublicUrlEnv] = `https://127.0.0.1:${allocatedPort}`;
    }

    hostUtils.expectedExitCode = expectedHubExitCode;
    let out: string;
    try {
        const spawnPromise = hostUtils.spawnHost(noDefaultPorts ? ["port", "instances-server-port"] : [], ...params);
        if (!hostUtils.host) throw new Error("Missing host from utils.");
        // Register before awaiting readiness so startup-failure exits remain owned.
        resources.hub = hostUtils.host;
        world.scenarioLifecycle.ownChild(hostUtils.host, "hub", {
            group: true,
            // Pre-stop callback: notify HostUtils that this Hub is being
            // deliberately stopped so the startup-exit assertion is suppressed.
            // Fires immediately before stop in both cleanup() and stop() paths,
            // scoped to this resource only (no early marking of others).
            onStop: () => hostUtils.markStopExpected(),
        });
        if (expectedHubExitCode !== undefined) world.scenarioLifecycle.expect(hostUtils.host);

        out = await spawnPromise;
    } finally {
        if (savedRunnerHostPort === undefined) delete process.env[runnerHostPortEnv];
        else process.env[runnerHostPortEnv] = savedRunnerHostPort;
        if (savedRunnerHostEnabled === undefined) delete process.env[runnerHostEnabledEnv];
        else process.env[runnerHostEnabledEnv] = savedRunnerHostEnabled;
        if (savedRunnerHostPublicUrl === undefined) delete process.env[runnerHostPublicUrlEnv];
        else process.env[runnerHostPublicUrlEnv] = savedRunnerHostPublicUrl;
    }

    if (!hostUtils.host) throw new Error("Missing host from utils.");

    spawned.add(hostUtils.host);
    hostUtils.host.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
        resources.hubExit = { code, signal };
        spawned.delete(hostUtils.host!);
    });

    resources.hostUtils = hostUtils;
    resources.startOutput = out;
}

export function saveHostEnv(): Record<string, string | undefined> {
    return {
        LOCAL_HOST_PORT: process.env.LOCAL_HOST_PORT,
        LOCAL_HOST_INSTANCES_SERVER_PORT: process.env.LOCAL_HOST_INSTANCES_SERVER_PORT,
        LOCAL_HOST_BASE_URL: process.env.LOCAL_HOST_BASE_URL,
        SCRAMJET_HOST_BASE_URL: process.env.SCRAMJET_HOST_BASE_URL,
        SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL: process.env.SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL,
    };
}

export function restoreHostEnv(saved: Record<string, string | undefined>) {
    for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
}

export function restoreSavedHostEnv(resources: CustomWorld["resources"]) {
    const savedHostEnv = resources.savedHostEnv as Record<string, string | undefined> | undefined;

    if (!savedHostEnv) return;

    restoreHostEnv(savedHostEnv);
    delete resources.savedHostEnv;
}

function getHostClient() {
    assert.notStrictEqual(process.env.LOCAL_HOST_BASE_URL, undefined);

    return new HostClient(process.env.LOCAL_HOST_BASE_URL as string);
}

async function rawHttpRequest(method: string, url: string, body: string | undefined, headers: Record<string, string> = {}) {
    return new Promise<{ status: number; ok: boolean; text: () => Promise<string> }>((resolve, reject) => {
        const target = new URL(url);
        const request = (target.protocol === "https:" ? httpsRequest : httpRequest)({
            method,
            protocol: target.protocol,
            hostname: target.hostname,
            port: target.port,
            path: `${target.pathname}${target.search}`,
            headers
        }, (response) => {
            const chunks: Buffer[] = [];

            response.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            response.on("error", reject);
            response.on("end", () => {
                const text = Buffer.concat(chunks).toString("utf8");

                const status = response.statusCode || 0;
                resolve({ status, ok: status >= 200 && status < 300, text: async () => text });
            });
        });

        request.on("error", reject);
        request.setTimeout(10000, () => request.destroy(new Error(`HTTP ${method} ${url} timed out`)));
        if (body !== undefined) {
            request.write(body);
        }
        request.end();
    });
}

function hostRootUrl(path: string): string {
    const base = new URL(process.env.LOCAL_HOST_BASE_URL as string);
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    return `${base.protocol}//${base.host}${normalizedPath}`;
}

When("I send a {string} request to {string} with body {string}", async function(method, path, body) {
    const url = process.env.LOCAL_HOST_BASE_URL + path;
    const response = await rawHttpRequest(method, url, body, { "Content-Type": "application/json" });

    this.response = response;
});

When("I send a {string} request to {string} with headers {string}", async function(method, path, headersJson) {
    const url = process.env.LOCAL_HOST_BASE_URL + path;
    const headers = JSON.parse(headersJson) as Record<string, string>;

    this.response = await rawHttpRequest(method, url, undefined, headers);
});

When("I send a {string} request to {string} with body {string} and headers {string}", async function(method, path, body, headersJson) {
    const url = process.env.LOCAL_HOST_BASE_URL + path;
    const headers = JSON.parse(headersJson) as Record<string, string>;

    this.response = await rawHttpRequest(method, url, body, headers);
});

When("I send a {string} root API request to {string} with body {string} and headers {string}", async function(method, path, body, headersJson) {
    const headers = JSON.parse(headersJson) as Record<string, string>;

    this.response = await rawHttpRequest(method, hostRootUrl(path), body, headers);
});

When("I send a {string} request to {string}", async function(method, path) {
    const url = process.env.LOCAL_HOST_BASE_URL + path;
    const response = await rawHttpRequest(method, url, undefined);

    this.response = response;

    assert.ok(response.ok, `Request failed with status ${response.status}`);
});

When('I send a {string} direct request to {string} on port {int}', async function (method, path, port) {
    
    const originalUrl = new URL(process.env.LOCAL_HOST_BASE_URL + path);
    
    originalUrl.port = port;
    originalUrl.pathname = path;

    const url = originalUrl.toString();
    const response = await waitForCondition(
        () => rawHttpRequest(method, url, undefined),
        (candidate) => candidate.ok,
        { timeoutMs: 10000, description: `Direct ${method} ${url}` }
    );

    this.response = response;

    assert.ok(response.ok, `Request failed with status ${response.status}`);
});

Then('the response body should be {string}', async function (string) {
    assert.strictEqual(await this.response.text(), string);
});

Then("the response status should be {int}", async function(int) {
    assert.strictEqual(this.response.status, int);
});

When("hub process is started with random ports and parameters {string}",
    async function(this: CustomWorld, params: string) {
        this.resources.expectedHubExitCode = undefined;
        const savedHostEnv = saveHostEnv();
        const apiPort = await freeport();
        const instancesServerPort = await freeport();

        process.env.LOCAL_HOST_PORT = apiPort.toString();
        process.env.LOCAL_HOST_INSTANCES_SERVER_PORT = instancesServerPort.toString();
        process.env.SCRAMJET_HOST_BASE_URL =
            process.env.LOCAL_HOST_BASE_URL =
                `http://127.0.0.1:${apiPort}/api/v1`;

        this.resources.hostClient = new HostClient(process.env.LOCAL_HOST_BASE_URL);
        this.resources.savedHostEnv = savedHostEnv;
        return startHubWithParams(this, params.split(" "));
    });

When("hub process is started with random ports and startup sequence timeout {int} ms and parameters {string}",
    { timeout: 30000 }, async function(this: CustomWorld, sequenceTimeoutMs: number, params: string) {
        assert.ok(sequenceTimeoutMs > 0, "Startup sequence timeout must be positive");
        const savedHostEnv = saveHostEnv();
        const apiPort = await freeport();
        const instancesServerPort = await freeport();
        process.env.LOCAL_HOST_PORT = apiPort.toString();
        process.env.LOCAL_HOST_INSTANCES_SERVER_PORT = instancesServerPort.toString();
        process.env.SCRAMJET_HOST_BASE_URL = process.env.LOCAL_HOST_BASE_URL = `http://127.0.0.1:${apiPort}/api/v1`;
        this.resources.hostClient = new HostClient(process.env.LOCAL_HOST_BASE_URL);
        this.resources.savedHostEnv = savedHostEnv;
        const template = JSON.parse(await readFile("data/sample-config-exit.json", "utf8"));
        template.sequences = template.sequences.map((sequence: { appConfig?: Record<string, unknown> }) => ({
            ...sequence,
            appConfig: { ...sequence.appConfig, exitTimeout: sequenceTimeoutMs }
        }));
        const configPath = `data/.hub-iac-exit-${process.pid}-${Date.now()}.json`;
        await writeFile(configPath, JSON.stringify(template));
        try {
            await startHubWithParams(this, params.replace("data/sample-config-exit.json", configPath).split(" "));
        } finally {
            await unlink(configPath).catch(() => undefined);
        }
    });

When("hub process is started with random ports expecting exit code {int} and parameters {string}",
    async function(this: CustomWorld, expectedExitCode: number, params: string) {
        this.resources.expectedHubExitCode = expectedExitCode;
        const savedHostEnv = saveHostEnv();

        const apiPort = await freeport();
        const instancesServerPort = await freeport();

        process.env.LOCAL_HOST_PORT = apiPort.toString();
        process.env.LOCAL_HOST_INSTANCES_SERVER_PORT = instancesServerPort.toString();
        process.env.SCRAMJET_HOST_BASE_URL =
            process.env.LOCAL_HOST_BASE_URL =
                `http://127.0.0.1:${apiPort}/api/v1`;

        this.resources.hostClient = new HostClient(process.env.LOCAL_HOST_BASE_URL);
        this.resources.savedHostEnv = savedHostEnv;
        return startHubWithParams(this, params.split(" "));
    });

When("hub process is started with port changing parameters {string}", function(this: CustomWorld, params: string) {
    const portParam = params.match(/(?:-P|--port) ([0-9]*)/) || [];

    this.resources.hostClient = new HostClient(`http://127.0.0.1:${portParam.length > 1 ? portParam[1] : 8000}/api/v1`);
    return startHubWithParams(this, params.split(" "), true);
});

When("hub process is started with parameters {string}", function(this: CustomWorld, params: string) {
    return startHubWithParams(this, params.split(" "));
});

Then("API is available on port {int}", async function(this: CustomWorld, port: number) {
    const hostClient = new HostClient(`http://127.0.0.1:${port}/api/v1`);
    const version = await hostClient.getVersion();

    assert.ok(version);
});

Then("I get list of sequences", async function(this: CustomWorld) {
    const hostClient = getHostClient();

    this.cliResources.sequences = await hostClient.listSequences();
});

Then("I get list of instances", async function(this: CustomWorld) {
    const hostClient = getHostClient();

    this.cliResources.instances = await hostClient.listInstances();
});

Then("I use instance client for stable name {string}", async function(this: CustomWorld, instanceName: string) {
    const hostClient = getHostClient();

    this.resources.instance = InstanceClient.from(instanceName, hostClient);
});

Then("stable instance name {string} becomes available", { timeout: 10000 }, async function(this: CustomWorld, instanceName: string) {
    const hostClient = getHostClient();

    let instance;
    const start = Date.now();

    do {
        const instances = await hostClient.listInstances();
        instance = instances.find((candidate: any) => candidate.instanceName === instanceName || candidate.id === instanceName);

        if (!instance) {
            await defer(100);
        }
    } while (!instance && Date.now() - start < 10000);

    assert.ok(instance, `Stable instance name ${instanceName} not registered`);
});

Then("I get list of {string} instances", async function(this: CustomWorld, tag: string) {
    // fails to conenct to cpm
    const hostClient = getHostClient();
    this.cliResources.instances = await hostClient.client.get(`rpc/monitor/api/instances`);
});

Then("there are some instances", async function() {
    const { instances } = (this as CustomWorld).cliResources;

    assert.notEqual(instances, undefined);
    assert.notEqual(instances?.length, 0);
});

Then("there are some sequences", async function() {
    const { sequences } = (this as CustomWorld).cliResources;

    assert.notEqual(sequences, undefined);
    assert.notEqual(sequences?.length, 0);
});

Then("I see a sequence called {string}", function(string: string) {
    const { sequences } = (this as CustomWorld).cliResources;
    const sequenceFound = sequences?.find(({ id }: { id: string }) => {
        return id === string;
    });

    assert.notStrictEqual(typeof sequenceFound, "undefined", `Sequence ${string} not found`);
});

Then("the output of an instance of {string} is as in {string} file", async function(this: CustomWorld, sequenceId, outputContentsFile) {
    const fileData = await readFile(outputContentsFile, "utf-8");
    const hostClient = getHostClient();
    const instance = this.cliResources.instances?.find((inst: any) => inst.sequence.id === sequenceId);

    if (!instance) throw new Error("Instance not found");

    const instClient = InstanceClient.from(instance.id, hostClient);

    const out = await waitUntilStreamEquals(await instClient.getStream("output"), fileData);

    assert.strictEqual(out, fileData);
});

Then("API starts with {string} server name", async function(this: CustomWorld, server: string) {
    const hostClient = new HostClient(`http://${server}/api/v1`);
    const version = await hostClient.getVersion();

    assert.ok(version);

    const apiURL = this.resources.startOutput.match(/API on\s*(.*)/)[1];

    console.log(`API is available on ${apiURL}`);

    assert.ok(new RegExp(server).test(apiURL));
});

Then("exit hub process", async function(this: CustomWorld) {
    const hub = this.resources.hub as ChildProcess;

    await this.scenarioLifecycle.stop(hub);

    spawned.delete(hub);
    restoreSavedHostEnv(this.resources);
});

Then("hub process exits on its own with code {int} within {int} ms", async function(this: CustomWorld, expectedCode: number, timeoutMs: number) {
    const hub = this.resources.hub as ChildProcess;

    if (!hub) {
        assert.fail("Hub process not found");
    }

    const existingCode = hub.exitCode ?? this.resources.hubExit?.code;

    if (existingCode !== null && typeof existingCode !== "undefined") {
        assert.strictEqual(existingCode, expectedCode);
        return;
    }

    // The exit is asserted as natural/expected; mark before waiting so the
    // registry cannot classify the expected exit as spontaneous.
    this.scenarioLifecycle.expect(hub);

    const exitResult = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
        const timer = setTimeout(() => {
            hub.off("exit", onExit);
            reject(new Error(`Hub process did not exit within ${timeoutMs} ms`));
        }, timeoutMs);

        const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
            clearTimeout(timer);
            resolve({ code, signal });
        };

        hub.once("exit", onExit);
    });

    this.resources.hubExit = exitResult;
    assert.strictEqual(exitResult.code, expectedCode);
});

Then("I capture Hub CPU and memory until it exits as {string}", { timeout: 35000 }, async function(this: CustomWorld, label: string) {
    await captureHubMetrics(this, label);
});

Then("10-second baseline-normalized idle CPU rate is at most {int} percent per second", function(this: CustomWorld, maxRatePercentPerSecond: number) {
    const metrics = this.resources.hubMetrics as Record<string, HubMetrics> | undefined;
    const baseline = metrics?.["2-second"];
    const longRun = metrics?.["10-second"];
    assert.ok(baseline && longRun, "Both Hub metric runs are required");
    assert.ok(baseline.cpuTimeMs > 0, "Baseline CPU time must be positive");
    const cpuDeltaMs = longRun.cpuTimeMs - baseline.cpuTimeMs;
    const durationDeltaMs = longRun.durationMs - baseline.durationMs;
    assert.ok(durationDeltaMs > 0, "Duration delta must be positive");
    const cpuRatePercentPerSecond = (cpuDeltaMs / baseline.cpuTimeMs) / (durationDeltaMs / 1000) * 100;
    assert.ok(cpuRatePercentPerSecond <= maxRatePercentPerSecond,
        `Baseline-normalized idle CPU rate ${cpuRatePercentPerSecond.toFixed(3)}%/s exceeds max ${maxRatePercentPerSecond}%/s`);
    console.log(`HUB_IAC_IDLE_CPU_RATE {"baselineCpuMs":${baseline.cpuTimeMs},"longRunCpuMs":${longRun.cpuTimeMs},"cpuDeltaMs":${cpuDeltaMs},"durationDeltaMs":${durationDeltaMs},"cpuRatePercentPerSecond":${cpuRatePercentPerSecond.toFixed(3)}}`);
    this.resources.hubIdleCpuRatePercentPerSecond = cpuRatePercentPerSecond;
});

Then("10-second Hub peak RSS is at most 5 percent above the 2-second baseline", function(this: CustomWorld) {
    const metrics = this.resources.hubMetrics as Record<string, HubMetrics> | undefined;
    const baseline = metrics?.["2-second"];
    const longRun = metrics?.["10-second"];
    assert.ok(baseline && longRun, "Both Hub metric runs are required");
    assert.ok(longRun.peakRssBytes <= baseline.peakRssBytes * 1.05,
        `10-second peak RSS ${longRun.peakRssBytes} exceeds 2-second baseline ${baseline.peakRssBytes} by more than 5%`);
});

Then("hub logs should contain {string} within {int} ms", async function(this: CustomWorld, expectedText: string, timeoutMs: number) {
    const hostUtils = this.resources.hostUtils as HostUtils | undefined;

    if (!hostUtils) {
        assert.fail("Host utils not found");
    }

    const start = Date.now();

    while (!hostUtils.output.includes(expectedText) && Date.now() - start < timeoutMs) {
        await defer(100);
    }

    assert.ok(hostUtils.output.includes(expectedText), `Expected host logs to contain: ${expectedText}`);
});

Then("hub logs should contain {string} exactly {int} times", function(this: CustomWorld, expectedText: string, expectedCount: number) {
    const hostUtils = this.resources.hostUtils as HostUtils | undefined;

    if (!hostUtils) {
        assert.fail("Host utils not found");
    }

    const actualCount = hostUtils.output.split(expectedText).length - 1;

    assert.strictEqual(actualCount, expectedCount, `Expected host logs to contain ${expectedText} exactly ${expectedCount} times, got ${actualCount}`);
});

Then("get runner container information", { timeout: 20000 }, async function(this: CustomWorld) {
    const instanceId = this.resources.instance!.id;
    let inspect: Dockerode.ContainerInspectInfo | undefined;

    await waitForCondition(async () => {
        const containers = await new Dockerode().listContainers({
            filters: { label: [`scramjet.instance.id=${instanceId}`] }
        });

        if (containers.length > 0) {
            const containerId = containers[0].Id;
            inspect = await new Dockerode().getContainer(containerId).inspect();

            this.resources.containerInspect = inspect;
            return inspect;
        }
        return undefined;
    }, Boolean, { timeoutMs: 10000, intervalMs: 50, description: `Container for instance ${instanceId}` });
});

Then("container memory limit is {int}", async function(this: CustomWorld, maxMem: number) {
    assert.equal(this.resources.containerInspect.HostConfig.Memory / 1024 ** 2, maxMem);
});

Then("container uses {string} image", async function(this: CustomWorld, image: string) {
    assert.equal(this.resources.containerInfo.Image, image);
});

Then("container uses node image defined in sth-config", async function(this: CustomWorld) {
    const defaultRunnerImage = defaultConfig.docker.runnerImages.node;

    assert.equal(this.resources.containerInfo.Image, defaultRunnerImage);
});

Then("get all containers", async function(this: CustomWorld) {
    this.resources.containers = await new Dockerode().listContainers();
});

Then("get last container info", async function(this: CustomWorld) {
    await waitForCondition(async () => {
        const containers = await new Dockerode().listContainers();
        const lastContainer = containers.filter(container =>
            !this.resources.containers.find((c: Dockerode.ContainerInfo) => c.Id === container.Id));

        if (lastContainer.length) {
            return this.resources.lastContainer = lastContainer[0];
        }
        return undefined;
    }, Boolean, { timeoutMs: 10000, intervalMs: 50, description: "new runner container" });
});

When("last container uses {string} image", async function(this: CustomWorld, image: string) {
    assert.equal(this.resources.lastContainer.Image, image);
});

Then("last container memory limit is {int}", async function(this: CustomWorld, maxMem: number) {
    const inspect = await new Dockerode().getContainer(this.resources.lastContainer.Id).inspect();

    if (inspect) {
        assert.equal(inspect.HostConfig?.Memory, maxMem * 1024 * 1024);
    }
});
