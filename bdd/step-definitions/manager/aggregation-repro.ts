/**
 * BDD step definitions for MANAGER-002 Manager aggregation regression.
 *
 * Covers 0rail/transform-hub#15: MultiManager-proxied Manager endpoints
 * /list, /all_sequences, /instances include inventory from connected hubs.
 *
 * Lifecycle:
 *   @aggregation-repro-cleanup scenarios tear down the MM+Manager+hubs stack.
 *
 * Environment variables:
 *   SCRAMJET_SPAWN_TS=1        – run from TypeScript source via ts-node
 *   SCRAMJET_TEST_LOG=1         – pipe child process stdout/stderr
 *   AGGREGATION_REPRO_BASE_PORT – optional fixed MM port (defaults to a free port)
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { ChildProcess, spawn } from "child_process";
import { PassThrough } from "stream";
import { resolve } from "path";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import { tmpdir } from "os";
import { promisify } from "util";
import { CustomWorld } from "../world";
import { ClientUtils } from "@scramjet/client-utils";
import { HostClient } from "@scramjet/api-client";
import { MultiManagerClient } from "@scramjet/multi-manager-api-client";

const freeport = promisify(require("freeport"));

const FIXTURE_ROOT = "bdd/fixtures/manager-aggregation";

function aggregationProcesses(world: CustomWorld): ChildProcess[] {
    if (!world.resources.aggProcesses) {
        world.resources.aggProcesses = [];
    }

    return world.resources.aggProcesses;
}

async function waitForGetFailure(baseUrl: string, endpoint: string, timeoutMs = 10_000): Promise<void> {
    const client = new ClientUtils(baseUrl);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        try {
            await client.get(endpoint);
        } catch {
            return;
        }

        await sleep(250);
    }

    throw new Error(`Timed out waiting for ${baseUrl}/${endpoint} to stop responding`);
}

After({ tags: "@aggregation-repro-cleanup" }, async function (this: CustomWorld) {
    for (const proc of aggregationProcesses(this)) {
        await this.scenarioLifecycle.stop(proc);
    }
    if (this.resources.aggMMProcess) {
        await this.scenarioLifecycle.stop(this.resources.aggMMProcess);
        delete this.resources.aggMMProcess;
    }

    if (this.resources.aggTempDir) {
        rmSync(this.resources.aggTempDir, { recursive: true, force: true });
        delete this.resources.aggTempDir;
    }

    delete this.resources.aggProcesses;
    delete this.resources.aggHubs;
    this.resources.aggReproCleanup = true;
});

/**
 * Get the executable command for a package (source or built).
 */
function getExecutableCmd(packageName: string): string[] {
    const cwd = getRepoRoot();

    if (process.env.SCRAMJET_SPAWN_TS) {
        return ["npx", "ts-node", resolve(cwd, `packages/${packageName}/src/bin/start.ts`)];
    }

    return ["node", resolve(cwd, `dist/${packageName}/bin/start.js`)];
}

function getRepoRoot(): string {
    const cwd = process.cwd();

    return existsSync(resolve(cwd, "packages")) ? cwd : resolve(cwd, "..");
}

/**
 * Spawn a process and resolve when it's ready.
 */
function spawnProcess(
    cmd: string[],
    options: string[],
    readyMatch?: string,
    timeout = 15000,
    env: Record<string, string> = {},
    lifecycle?: CustomWorld["scenarioLifecycle"]
): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
        const fullCmd = [...cmd, ...options];
        const proc = spawn("/usr/bin/env", fullCmd, {
            detached: true,
            env: { ...process.env, ...env },
            stdio: ["ignore", "pipe", "pipe"]
        });
        lifecycle?.ownChild(proc, `aggregation:${cmd[cmd.length - 1]}`, { group: true });

        const timer = setTimeout(() => {
            void (async () => {
                let teardownError: any;
                try {
                    if (lifecycle) await lifecycle.stop(proc);
                } catch (error) {
                    teardownError = error;
                }
                const timeoutError: any = new Error(`Timeout waiting for process to be ready (${readyMatch || "no pattern"})`);
                if (teardownError) {
                    timeoutError.cleanupErrors = [teardownError];
                    timeoutError.cause = teardownError;
                    timeoutError.message += `; teardown failed: ${teardownError.message}`;
                }
                reject(timeoutError);
            })();
        }, timeout);

        proc.stderr?.on("data", (data: Buffer) => {
            if (!process.env.SCRAMJET_TEST_LOG) {
                return;
            }

            process.stderr.write(data);
        });

        if (readyMatch) {
            proc.stdout?.on("data", (data: Buffer) => {
                const text = data.toString();

                if (process.env.SCRAMJET_TEST_LOG) {
                    process.stdout.write(data);
                }

                if (text.includes(readyMatch)) {
                    clearTimeout(timer);
                    resolve(proc);
                }
            });
        } else {
            // Resolve after a short delay
            setTimeout(() => {
                clearTimeout(timer);
                resolve(proc);
            }, 1000);
        }

        if (!readyMatch && process.env.SCRAMJET_TEST_LOG) {
            proc.stdout?.on("data", (data: Buffer) => process.stdout.write(data));
        }

        proc.on("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

/**
 * Sleep helper.
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function waitUntilStreamContainsBounded(
    stream: NodeJS.ReadableStream,
    expected: string,
    timeout = 20_000,
    maxBuffered = 8_192
): Promise<boolean> {
    const maxWindow = Math.max(maxBuffered, expected.length * 2);
    let recent = "";

    return new Promise((resolve, reject) => {
        const cleanup = () => {
            clearTimeout(timer);
            stream.off("data", onData);
            stream.off("end", onEnd);
            stream.off("error", onError);
        };
        const finish = (result: boolean) => {
            cleanup();
            resolve(result);
        };
        const fail = (error: Error) => {
            cleanup();
            reject(error);
        };
        const onData = (chunk: Buffer | string) => {
            recent += chunk.toString();
            if (recent.length > maxWindow) {
                recent = recent.slice(-maxWindow);
            }

            if (recent.includes(expected)) {
                finish(true);
            }
        };
        const onEnd = () => fail(new Error("End of stream reached"));
        const onError = (error: Error) => fail(error);
        const timer = setTimeout(() => {
            fail(new Error(`Stream did not contain ${JSON.stringify(expected)} before timeout`));
        }, timeout);

        stream.on("data", onData);
        stream.on("end", onEnd);
        stream.on("error", onError);
    });
}

async function waitForGet(baseUrl: string, endpoint: string, timeoutMs = 20_000): Promise<void> {
    const client = new ClientUtils(baseUrl);
    const deadline = Date.now() + timeoutMs;
    let lastError: Error | undefined;

    while (Date.now() < deadline) {
        try {
            await client.get(endpoint);
            return;
        } catch (error) {
            lastError = error as Error;
            await sleep(500);
        }
    }

    throw new Error(`Timed out waiting for ${baseUrl}/${endpoint}: ${lastError?.message || "no response"}`);
}

async function waitForManagerTopicActor(
    world: CustomWorld,
    topicName: string,
    hubName: string,
    role: "provider" | "consumer",
    timeoutMs = 15_000
): Promise<void> {
    const client = new ClientUtils((world.resources.aggMMClient as MultiManagerClient).apiBase);
    const managerId = world.resources.aggManagerId as string;
    const deadline = Date.now() + timeoutMs;
    let lastTopics: unknown;

    while (Date.now() < deadline) {
        lastTopics = await client.get<any>(`cpm/${managerId}/api/v1/topics`);

        const topics = Array.isArray(lastTopics) ? lastTopics : [];
        const topic = topics.find((item: any) => item.name === topicName || item.topicName === topicName);
        const actors = Array.isArray(topic?.actors) ? topic.actors : [];
        const matchingActor = actors.find((actor: any) =>
            actor.hostId === hubName &&
            actor.type === "host" &&
            actor.role === role &&
            actor.retired !== true
        );

        if (matchingActor) {
            return;
        }

        await sleep(500);
    }

    assert.fail(
        `Expected Manager topic ${topicName} to include ${role} actor for ${hubName}, ` +
        `last topics: ${JSON.stringify(lastTopics)}`
    );
}

async function rawHttpRequest(method: string, url: string, body: string | undefined, headers: Record<string, string>) {
    return new Promise<{ status: number; text: () => Promise<string> }>((resolve, reject) => {
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

                resolve({
                    status: response.statusCode || 0,
                    text: async () => text
                });
            });
        });

        request.on("error", reject);
        if (body !== undefined) {
            request.write(body);
        }
        request.end();
    });
}

async function queryManagerProxy(world: CustomWorld, endpoint: string): Promise<void> {
    const mmClient = world.resources.aggMMClient as MultiManagerClient;
    const managerId = world.resources.aggManagerId as string;
    const clientUtils = new ClientUtils(mmClient.apiBase);

    try {
        const response = await clientUtils.get<any>(
            `cpm/${managerId}/api/v1${endpoint}`
        );

        world.resources.aggProxyResponse = response;
        world.resources.aggProxyError = null;
        world.resources.aggProxyEndpoint = endpoint;
    } catch (e) {
        world.resources.aggProxyResponse = null;
        world.resources.aggProxyError = e;
        world.resources.aggProxyEndpoint = endpoint;
    }
}

function aggregationManagerProxyUrl(world: CustomWorld, endpoint: string): string {
    const mmClient = world.resources.aggMMClient as MultiManagerClient;
    const managerId = world.resources.aggManagerId as string;
    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    return `${mmClient.apiBase}/cpm/${managerId}/api/v1${normalizedEndpoint}`;
}

function aggregationRootUrl(world: CustomWorld, endpoint: string): string {
    const mmClient = world.resources.aggMMClient as MultiManagerClient;
    const managerId = world.resources.aggManagerId as string;
    const rootBase = mmClient.apiBase.replace(/\/api\/v1\/?$/, "");
    const resolvedEndpoint = endpoint.replace("mgr-PLACEHOLDER", managerId);
    const normalizedEndpoint = resolvedEndpoint.startsWith("/") ? resolvedEndpoint : `/${resolvedEndpoint}`;

    return `${rootBase}${normalizedEndpoint}`;
}

function aggregationHubUrl(world: CustomWorld, hubName: string, endpoint: string): string {
    const hubs = world.resources.aggHubs as Record<string, { apiBase: string }> || {};
    const hub = hubs[hubName];

    assert.ok(hub, `Hub ${hubName} not found`);

    const rootBase = hub.apiBase.replace(/\/api\/v1\/?$/, "");
    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    return `${rootBase}${normalizedEndpoint}`;
}

function aggregationHub(world: CustomWorld, hubName: string): { client: HostClient } {
    const hubs = world.resources.aggHubs as Record<string, { client: HostClient }> || {};
    const hub = hubs[hubName];

    assert.ok(hub, `Hub ${hubName} not found`);

    return hub;
}

async function sendAggregationManagerProxyRequest(
    world: CustomWorld,
    method: string,
    endpoint: string,
    body: string,
    headersJson: string
): Promise<void> {
    world.response = await rawHttpRequest(
        method,
        aggregationManagerProxyUrl(world, endpoint),
        body,
        JSON.parse(headersJson) as Record<string, string>
    );
}

// =========================================================================
// Background steps
// =========================================================================

Given("an isolated MultiManager aggregation stack", { timeout: 30000 }, async function (this: CustomWorld) {
    const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const mmPort = process.env.AGGREGATION_REPRO_BASE_PORT
        ? parseInt(process.env.AGGREGATION_REPRO_BASE_PORT, 10)
        : await freeport();
    const verser2Port = await freeport();
    const id = `mm-agg-${runId}`;
    const managerId = `mgr-agg-${runId}`;
    const tempDir = mkdtempSync(resolve(tmpdir(), "scramjet-manager-aggregation-"));

    const mmOptions = [
        `--id=${id}`,
        `--server-api-port=${mmPort}`,
        "--host=0.0.0.0",
        `--verser2-host-bind-port=${verser2Port}`,
        "--verser2-host-bind-host=0.0.0.0",
        `--verser2-host-public-url=https://127.0.0.1:${verser2Port}`,
        "--verser2-allow-local-peers=true",
        `--verser2-host-identity-dir=${tempDir}/verser2-mm`,
        "--log-level=INFO",
    ];

    const cmd = getExecutableCmd("multi-manager");
    const mmEnv = {
        SCRAMJET_VERSER2_HOST_BIND_PORT: String(verser2Port),
        SCRAMJET_VERSER2_HOST_BIND_HOST: "0.0.0.0",
        SCRAMJET_VERSER2_HOST_PUBLIC_URL: `https://127.0.0.1:${verser2Port}`,
        SCRAMJET_VERSER2_ALLOW_LOCAL_PEERS: "true",
        SCRAMJET_VERSER2_HOST_IDENTITY_DIR: `${tempDir}/verser2-mm`
    };
    const proc = await spawnProcess(cmd, mmOptions, undefined, 15_000, {
        ...mmEnv
    }, this.scenarioLifecycle);

    this.resources.aggMMProcess = proc;
    this.resources.aggMMCommand = cmd;
    this.resources.aggMMOptions = mmOptions;
    this.resources.aggMMEnv = mmEnv;
    this.resources.aggMMId = id;
    this.resources.aggMMApiBase = `http://127.0.0.1:${mmPort}/api/v1`;
    this.resources.aggMMClient = new MultiManagerClient(this.resources.aggMMApiBase);
    this.resources.aggManagerId = managerId;
    this.resources.aggTempDir = tempDir;
    this.resources.aggVerser2Port = verser2Port;

    await waitForGet(this.resources.aggMMApiBase, "version", 20_000);

    const mmClient = this.resources.aggMMClient as MultiManagerClient;
    const managerConfig = {
        id: managerId,
        verser2: {
            localBroker: {
                peerId: `manager.${managerId}.broker`,
                routeDomain: `manager.${managerId}.scramjet.internal`,
            },
            localGuest: {
                peerId: `manager.${managerId}.guest`,
                routeDomain: `manager.${managerId}.scramjet.internal`,
            },
        },
    };

    const response = await mmClient.startManager(managerConfig as any);

    assert.ok(response, "Expected Manager to be started");

    // Fetch verser2 trust material
    const client = new ClientUtils(this.resources.aggMMApiBase);
    let trustMaterial: any;

    try {
        trustMaterial = await client.get<any>(`verser2/trust/${managerId}`);
    } catch (e) {
        // Manager might not expose trust endpoint yet; the scenario will fail later if trust is required.
        console.log("Note: could not fetch verser2 trust material:", (e as Error).message);
    }

    this.resources.aggManagerConfig = managerConfig;
    this.resources.aggManagerClient = mmClient.getManagerClient(managerId);
    if (trustMaterial?.ca) {
        this.resources.aggVerser2CA = trustMaterial.ca;
    }
});

Given("an STH hub {string} is connected to the aggregation Manager", {
    timeout: 60000
}, async function (
    this: CustomWorld,
    hubName: string
) {
    const apiPort = await freeport();
    const instancesPort = await freeport();
    const runnerHostPort = await freeport();
    const tempDir = this.resources.aggTempDir as string;
    const runHubName = `${hubName}-${this.resources.aggManagerId}`;
    const managerId = this.resources.aggManagerId as string;
    const verser2Port = this.resources.aggVerser2Port as number;
    const hubDir = resolve(tempDir, runHubName);
    const configPath = `${hubDir}/sth-config.json`;

    rmSync(hubDir, { recursive: true, force: true });
    mkdirSync(hubDir, { recursive: true });

    const cwd = getRepoRoot();
    const sequencesRootAbsolute = resolve(cwd, `${FIXTURE_ROOT}/sequences`);
    const startupConfigAbsolute = resolve(cwd, `${FIXTURE_ROOT}/startup/${hubName}.json`);
    writeFileSync(configPath, JSON.stringify({
        verser2: {
            runnerHost: {
                enabled: true,
                identityDir: `${hubDir}/verser2-runner-host`,
                host: {
                    bindHost: "127.0.0.1",
                    bindPort: runnerHostPort,
                    publicUrl: `https://127.0.0.1:${runnerHostPort}`,
                },
                localBroker: {
                    peerId: `sth.${runHubName}.runner.broker`,
                },
            },
        },
    }, null, 2));

    const cmd = process.env.SCRAMJET_SPAWN_TS
        ? ["npx", "ts-node", resolve(cwd, "packages/sth/src/bin/hub.ts")]
        : ["node", resolve(cwd, "dist/sth/bin/hub.js")];

    const hubOpts = [
        `--id=${hubName}`,
        `--config=${configPath}`,
        `--cpm-url=${this.resources.aggMMApiBase}`,
        `--cpm-id=${managerId}`,
        `--port=${apiPort}`,
        `--hostname=127.0.0.1`,
        `--instances-server-port=${instancesPort}`,
        `--runtime-adapter=process`,
        `--sequences-root=${sequencesRootAbsolute}`,
        `--startup-config=${startupConfigAbsolute}`,
        `--identify-existing`,
        "--log-level=INFO",
        "--kill-on-exit",
        // verser2: connect to Manager
        `--verser2-enabled=true`,
        `--verser2-host-url=https://127.0.0.1:${verser2Port}`,
        `--verser2-guest-peer-id=sth.${runHubName}.guest`,
        `--verser2-guest-route-domain=sth.${runHubName}.scramjet.internal`,
        `--verser2-broker-peer-id=sth.${runHubName}.broker`,
        `--verser2-broker-target-domain=manager.${managerId}.scramjet.internal`,
    ];

    const hubEnv: Record<string, string> = {
        SCRAMJET_VERSER2_RUNNER_HOST_BIND_PORT: String(runnerHostPort),
        SCRAMJET_VERSER2_HOST_URL: `https://127.0.0.1:${verser2Port}`,
        SCRAMJET_VERSER2_GUEST_PEER_ID: `sth.${runHubName}.guest`,
        SCRAMJET_VERSER2_GUEST_ROUTE_DOMAIN: `sth.${runHubName}.scramjet.internal`,
        SCRAMJET_VERSER2_BROKER_PEER_ID: `sth.${runHubName}.broker`,
        SCRAMJET_VERSER2_BROKER_TARGET_DOMAIN: `manager.${managerId}.scramjet.internal`,
        SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL: `https://127.0.0.1:${runnerHostPort}`,
        SCRAMJET_VERSER2_RUNNER_HOST_BROKER_PEER_ID: `sth.${runHubName}.runner.broker`,
        SCRAMJET_VERSER2_RUNNER_HOST_IDENTITY_DIR: `${hubDir}/verser2-runner-host`,
        SCRAMJET_VERSER2_RUNNER_HOST_ALLOW_LOCAL_PEERS: "true",
    };

    // If we have verser2 CA, pass it
    if (this.resources.aggVerser2CA) {
        const caPath = resolve(hubDir, "verser2-ca.pem");

        writeFileSync(caPath, this.resources.aggVerser2CA);
        hubOpts.push(`--verser2-ca-file=${caPath}`);
        hubEnv.SCRAMJET_VERSER2_CA_FILE = caPath;
    }

    try {
        const proc = await spawnProcess(cmd, hubOpts, undefined, 20_000, hubEnv, this.scenarioLifecycle);
        const apiBase = `http://127.0.0.1:${apiPort}/api/v1`;

        aggregationProcesses(this).push(proc);

        await waitForGet(apiBase, "version", 30_000);

        if (!this.resources.aggHubs) {
            this.resources.aggHubs = {};
        }

        this.resources.aggHubs[hubName] = {
            process: proc,
            apiBase,
            client: new HostClient(apiBase),
        };
        this.resources.aggHubCount = (this.resources.aggHubCount || 0) + 1;
    } catch (e) {
        assert.fail(`Hub ${hubName} failed to start: ${(e as Error).message}`);
    }
});

Given("I wait for hubs to register with the Manager", { timeout: 15000 }, async function (
    this: CustomWorld
) {
    const client = new ClientUtils((this.resources.aggMMClient as MultiManagerClient).apiBase);
    const managerId = this.resources.aggManagerId as string;
    const expectedHubCount = this.resources.aggHubCount || 0;
    const deadline = Date.now() + 12_000;
    let lastResponse: unknown;

    while (Date.now() < deadline) {
        lastResponse = await client.get<any>(`cpm/${managerId}/api/v1/list`);

        const hubs = Array.isArray(lastResponse) ? lastResponse : [];

        if (hubs.length >= expectedHubCount) {
            // Verify each hub has an active Verser2 route before proceeding.
            // isConnectionActive reflects STHController.isConnectionActive which
            // calls brokerTransport.isRouteReady(routeDomain) — true only after
            // the Verser2 route subscription handshake completes.
            const allActive = hubs.every((h: any) => h.isConnectionActive === true);

            if (allActive) {
                return;
            }
        }

        await sleep(500);
    }

    const activeInfo = (Array.isArray(lastResponse) ? lastResponse : [])
        .map((h: any) => `${h.id}:isConnectionActive=${h.isConnectionActive}`)
        .join("; ");

    assert.fail(
        `Expected ${expectedHubCount} hubs to register with active routes, ` +
        `last response: ${JSON.stringify(lastResponse)}. ` +
        `Active states: ${activeInfo}`
    );
});

// =========================================================================
// When steps
// =========================================================================

When("I query the Manager {string} through the MultiManager proxy", async function (
    this: CustomWorld,
    endpoint: string
) {
    await queryManagerProxy(this, endpoint);
});

When("I send a {string} request through the aggregation Manager proxy to {string} with headers {string}", async function (
    this: CustomWorld,
    method: string,
    endpoint: string,
    headersJson: string
) {
    this.response = await rawHttpRequest(
        method,
        aggregationManagerProxyUrl(this, endpoint),
        undefined,
        JSON.parse(headersJson) as Record<string, string>
    );
});

When("I send a {string} request through the aggregation Manager proxy to {string} with body {string} and headers {string}", async function (
    this: CustomWorld,
    method: string,
    endpoint: string,
    body: string,
    headersJson: string
) {
    await sendAggregationManagerProxyRequest(this, method, endpoint, body, headersJson);
});

When("I eventually send a {string} request through the aggregation Manager proxy to {string} with body {string} and headers {string}", { timeout: 20000 }, async function (
    this: CustomWorld,
    method: string,
    endpoint: string,
    body: string,
    headersJson: string
) {
    const deadline = Date.now() + 15_000;
    let lastError: Error | undefined;

    while (Date.now() < deadline) {
        try {
            await sendAggregationManagerProxyRequest(this, method, endpoint, body, headersJson);

            if (this.response?.status === 200) {
                return;
            }
        } catch (error) {
            lastError = error as Error;
        }

        await sleep(500);
    }

    if (lastError) {
        throw lastError;
    }
});

When("I send a {string} request through the aggregation MultiManager root to {string} with body {string} and headers {string}", async function (
    this: CustomWorld,
    method: string,
    endpoint: string,
    body: string,
    headersJson: string
) {
    this.response = await rawHttpRequest(
        method,
        aggregationRootUrl(this, endpoint),
        body,
        JSON.parse(headersJson) as Record<string, string>
    );
});

When("I send a {string} request to aggregation hub {string} at {string} with headers {string}", async function (
    this: CustomWorld,
    method: string,
    hubName: string,
    endpoint: string,
    headersJson: string
) {
    this.response = await rawHttpRequest(
        method,
        aggregationHubUrl(this, hubName, endpoint),
        undefined,
        JSON.parse(headersJson) as Record<string, string>
    );
});

When("source sequence {string} calls target sequence {string} through the aggregation Manager", async function (
    this: CustomWorld,
    sourceInstanceName: string,
    targetInstanceName: string
) {
    const sourceHubName = sourceInstanceName.startsWith("hub-2-") ? "hub-2" : "hub-1";
    const targetHubName = targetInstanceName.startsWith("hub-2-") ? "hub-2" : "hub-1";
    const sourceHub = encodeURIComponent(sourceHubName);
    const targetHub = encodeURIComponent(targetHubName);
    const targetInstance = encodeURIComponent(targetInstanceName);

    this.response = await rawHttpRequest(
        "POST",
        aggregationManagerProxyUrl(this, `/sth/${sourceHubName}/instance/${sourceInstanceName}/rpc/test/call-target?sourceHub=${sourceHub}&targetHub=${targetHub}&targetInstance=${targetInstance}`),
        "sequence-to-sequence",
        { "Content-Type": "text/plain" }
    );
});

When("I query hub {string} for its sequences", async function (
    this: CustomWorld,
    hubName: string
) {
    const hubs = this.resources.aggHubs as Record<string, any> || {};
    const hub = hubs[hubName];

    if (!hub) {
        this.resources.aggHubResponse = null;
        this.resources.aggHubError = new Error(`Hub ${hubName} not found`);
        return;
    }

    try {
        const sequences = await hub.client.listSequences();
        this.resources.aggHubResponse = sequences;
        this.resources.aggHubError = null;
    } catch (e) {
        this.resources.aggHubResponse = null;
        this.resources.aggHubError = e;
    }
});

When("I query hub {string} for its instances", async function (
    this: CustomWorld,
    hubName: string
) {
    const hubs = this.resources.aggHubs as Record<string, any> || {};
    const hub = hubs[hubName];

    if (!hub) {
        this.resources.aggHubResponse = null;
        this.resources.aggHubError = new Error(`Hub ${hubName} not found`);
        return;
    }

    try {
        const instances = await hub.client.listInstances();
        this.resources.aggHubResponse = instances;
        this.resources.aggHubError = null;
    } catch (e) {
        this.resources.aggHubResponse = null;
        this.resources.aggHubError = e;
    }
});

When("aggregation hub {string} opens topic {string} with content-type {string}", async function (
    this: CustomWorld,
    hubName: string,
    topicName: string,
    contentType: string
) {
    this.resources.aggTopicStream = await aggregationHub(this, hubName).client.getTopic(topicName, {}, contentType);
});

When("aggregation topic {string} is opened on hub {string} with content-type {string}", async function (
    this: CustomWorld,
    topicName: string,
    hubName: string,
    contentType: string
) {
    this.resources.aggTopicStream = await aggregationHub(this, hubName).client.getTopic(topicName, {}, contentType);
});

When("aggregation hub {string} sends topic {string} data {string} with content-type {string}", async function (
    this: CustomWorld,
    hubName: string,
    topicName: string,
    data: string,
    contentType: string
) {
    const stream = new PassThrough({ encoding: undefined });
    const sendPromise = aggregationHub(this, hubName).client.sendTopic(topicName, stream, {}, contentType, true);

    stream.write(data);
    stream.end();

    await sendPromise;
});

When("aggregation sequence {string} on hub {string} starts with input topic {string}", async function (
    this: CustomWorld,
    sequenceName: string,
    hubName: string,
    topicName: string
) {
    const sequence = aggregationHub(this, hubName).client.getSequenceClient(sequenceName);

    this.resources.aggInstance = await sequence.start({
        appConfig: {},
        inputTopic: topicName
    });
    this.resources.aggInstanceOutput = await this.resources.aggInstance.getStream("output");
    await waitForManagerTopicActor(this, topicName, hubName, "consumer");
});

When("aggregation sequence {string} on hub {string} starts with output topic {string}", async function (
    this: CustomWorld,
    sequenceName: string,
    hubName: string,
    topicName: string
) {
    const sequence = aggregationHub(this, hubName).client.getSequenceClient(sequenceName);

    this.resources.aggInstance = await sequence.start({
        appConfig: {},
        outputTopic: topicName
    });
    await waitForManagerTopicActor(this, topicName, hubName, "provider");
});

When("aggregation instance receives input {string}", async function (this: CustomWorld, data: string) {
    assert.ok(this.resources.aggInstance, "No aggregation instance is active");

    await this.resources.aggInstance.sendStream(
        "input",
        data,
        {},
        { type: "text/plain", end: true }
    );
});

When("the aggregation Manager is restarted", { timeout: 30000 }, async function (this: CustomWorld) {
    const mmClient = this.resources.aggMMClient as MultiManagerClient;
    const client = new ClientUtils(mmClient.apiBase);
    const managerId = this.resources.aggManagerId as string;

    // Stop the Manager via MultiManager API.
    await client.post(
        `cpm/${managerId}/stop`,
        undefined,
        { headers: { "content-type": "application/json" } }
    );

    // Wait for Manager to be removed from the store.
    const stopDeadline = Date.now() + 10_000;
    let stopped = false;

    while (Date.now() < stopDeadline) {
        const managers = await client.get<any[]>("list");

        if (Array.isArray(managers) && !managers.some((m: any) => m.id === managerId)) {
            stopped = true;
            break;
        }

        await sleep(500);
    }

    assert.ok(stopped, `Expected Manager ${managerId} to stop before restart`);

    // Start Manager again with the same configuration (store the config for reuse).
    const managerConfig = this.resources.aggManagerConfig || {
        id: managerId,
        verser2: {
            localBroker: {
                peerId: `manager.${managerId}.broker`,
                routeDomain: `manager.${managerId}.scramjet.internal`,
            },
            localGuest: {
                peerId: `manager.${managerId}.guest`,
                routeDomain: `manager.${managerId}.scramjet.internal`,
            },
        },
    };

    const response = await mmClient.startManager(managerConfig as any);

    assert.ok(response, "Expected Manager to be restarted");

    this.resources.aggManagerClient = response;

    // Re-fetch verser2 trust material (the new Manager may have different credentials).
    try {
        const trustMaterial = await client.get<any>(`verser2/trust/${managerId}`);

        if (trustMaterial?.ca) {
            this.resources.aggVerser2CA = trustMaterial.ca;
        }
    } catch (e) {
        console.log("Note: could not fetch verser2 trust material:", (e as Error).message);
    }
});

When("the aggregation MultiManager process is restarted", { timeout: 45000 }, async function (this: CustomWorld) {
    const oldProcess = this.resources.aggMMProcess as ChildProcess | undefined;
    const cmd = this.resources.aggMMCommand as string[] | undefined;
    const mmOptions = this.resources.aggMMOptions as string[] | undefined;
    const mmEnv = this.resources.aggMMEnv as Record<string, string> | undefined;
    const mmApiBase = this.resources.aggMMApiBase as string;
    const managerId = this.resources.aggManagerId as string;
    const managerConfig = this.resources.aggManagerConfig || {
        id: managerId,
        verser2: {
            localBroker: {
                peerId: `manager.${managerId}.broker`,
                routeDomain: `manager.${managerId}.scramjet.internal`,
            },
            localGuest: {
                peerId: `manager.${managerId}.guest`,
                routeDomain: `manager.${managerId}.scramjet.internal`,
            },
        },
    };

    assert.ok(oldProcess, "Expected aggregation MultiManager process to exist");
    assert.ok(cmd, "Expected aggregation MultiManager command to be stored");
    assert.ok(mmOptions, "Expected aggregation MultiManager options to be stored");
    assert.ok(mmEnv, "Expected aggregation MultiManager environment to be stored");

    await this.scenarioLifecycle.stop(oldProcess);
    await waitForGetFailure(mmApiBase, "version", 10_000);

    const proc = await spawnProcess(cmd, mmOptions, undefined, 15_000, mmEnv, this.scenarioLifecycle);

    this.resources.aggMMProcess = proc;
    this.resources.aggMMClient = new MultiManagerClient(mmApiBase);

    await waitForGet(mmApiBase, "version", 20_000);

    const mmClient = this.resources.aggMMClient as MultiManagerClient;
    const response = await mmClient.startManager(managerConfig as any);

    assert.ok(response, "Expected Manager to be started after MultiManager restart");

    this.resources.aggManagerClient = response;

    try {
        const client = new ClientUtils(mmApiBase);
        const trustMaterial = await client.get<any>(`verser2/trust/${managerId}`);

        if (trustMaterial?.ca) {
            this.resources.aggVerser2CA = trustMaterial.ca;
        }
    } catch {
        // Keep the previous trust material; reconnect assertions below prove whether it is still usable.
    }
});

// =========================================================================
// Then steps
// =========================================================================

Then("the Manager proxy response should contain at least {int} items", { timeout: 20000 }, async function (
    this: CustomWorld,
    minCount: number
) {
    const endpoint = this.resources.aggProxyEndpoint as string | undefined;
    const deadline = Date.now() + 15_000;

    while (Date.now() < deadline) {
        if (!this.resources.aggProxyError) {
            const response = this.resources.aggProxyResponse;
            const arr = Array.isArray(response) ? response : (response?.data ? response.data : null);

            if (Array.isArray(arr) && arr.length >= minCount) {
                return;
            }
        }

        if (!endpoint) {
            break;
        }

        await sleep(500);
        await queryManagerProxy(this, endpoint);
    }

    if (this.resources.aggProxyError) {
        assert.fail(`MM proxy query failed: ${(this.resources.aggProxyError as Error).message}`);
    }

    const response = this.resources.aggProxyResponse;
    const arr = Array.isArray(response) ? response : (response?.data ? response.data : null);

    assert.ok(Array.isArray(arr), `Expected response to be an array, got ${JSON.stringify(response)}`);
    assert.ok(
        arr.length >= minCount,
        `Expected Manager proxy response to include at least ${minCount} item(s), got ${arr.length}: ${JSON.stringify(arr)}`
    );
});

Then("the hub response should contain at least {int} sequence", function (
    this: CustomWorld,
    minCount: number
) {
    if (this.resources.aggHubError) {
        assert.fail(`Direct hub query failed: ${(this.resources.aggHubError as Error).message}`);
    }

    const response = this.resources.aggHubResponse;
    const arr = Array.isArray(response) ? response : [];

    assert.ok(
        arr.length >= minCount,
        `Expected direct hub API to contain at least ${minCount} sequence(s), got ${arr.length}: ${JSON.stringify(response)}`
    );
});

Then("the hub response should contain at least {int} instance", function (
    this: CustomWorld,
    minCount: number
) {
    if (this.resources.aggHubError) {
        assert.fail(`Direct hub query failed: ${(this.resources.aggHubError as Error).message}`);
    }

    const response = this.resources.aggHubResponse;
    const arr = Array.isArray(response) ? response : [];

    assert.ok(
        arr.length >= minCount,
        `Expected direct hub API to contain at least ${minCount} instance(s), got ${arr.length}: ${JSON.stringify(response)}`
    );
});

Then("aggregation topic data should contain {string}", { timeout: 30000 }, async function (
    this: CustomWorld,
    expected: string
) {
    assert.ok(this.resources.aggTopicStream, "No aggregation topic stream is open");

    const received = await waitUntilStreamContainsBounded(this.resources.aggTopicStream, expected, 20_000);

    assert.equal(received, true);
    this.resources.aggTopicStream.destroy?.();
});

Then("aggregation instance output should contain {string}", { timeout: 30000 }, async function (
    this: CustomWorld,
    expected: string
) {
    assert.ok(this.resources.aggInstanceOutput, "No aggregation instance output stream is open");

    const received = await waitUntilStreamContainsBounded(this.resources.aggInstanceOutput, expected, 20_000);

    assert.equal(received, true);
    this.resources.aggInstanceOutput.destroy?.();
});

Then("aggregation routed input should contain {string} and routed output topic should contain {string}", { timeout: 45000 }, async function (
    this: CustomWorld,
    inputExpected: string,
    outputExpected: string
) {
    assert.ok(this.resources.aggInstanceOutput, "No aggregation instance output stream is open");
    assert.ok(this.resources.aggTopicStream, "No aggregation topic stream is open");

    const results = await Promise.allSettled([
        waitUntilStreamContainsBounded(this.resources.aggInstanceOutput, inputExpected, 20_000),
        waitUntilStreamContainsBounded(this.resources.aggTopicStream, outputExpected, 20_000)
    ]);

    this.resources.aggInstanceOutput.destroy?.();
    this.resources.aggTopicStream.destroy?.();

    const failures = results
        .map((result, index) => result.status === "rejected"
            ? `${index === 0 ? "routed input" : "routed output"}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`
            : null)
        .filter(Boolean);

    assert.deepEqual(failures, []);
});
