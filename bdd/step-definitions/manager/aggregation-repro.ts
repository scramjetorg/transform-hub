/**
 * BDD step definitions for MANAGER-002 Manager aggregation repro.
 *
 * Reproduces 0rail/transform-hub#15: MultiManager-proxied Manager
 * endpoints /list, /all_sequences, /instances return 200 [] even
 * though connected STH hubs report sequences and instances directly.
 *
 * Lifecycle:
 *   @aggregation-repro-setup scenarios start a MM+Manager and two hubs.
 *   @aggregation-repro-cleanup scenarios tear down the stack after all assertions.
 *
 * Environment variables:
 *   SCRAMJET_SPAWN_TS=1        – run from TypeScript source via ts-node
 *   SCRAMJET_TEST_LOG=1         – pipe child process stdout/stderr
 *   AGGREGATION_REPRO_BASE_PORT – base port for MM/hubs (default 25000)
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { ChildProcess, spawn } from "child_process";
import { resolve } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { promisify } from "util";
import { CustomWorld } from "../world";
import { ClientUtils } from "@scramjet/client-utils";
import { HostClient } from "@scramjet/api-client";
import { MultiManagerClient } from "@scramjet/multi-manager-api-client";

const freeport = promisify(require("freeport"));

const BASE_PORT = parseInt(process.env.AGGREGATION_REPRO_BASE_PORT || "25000", 10);
const VERSER2_PORT = BASE_PORT + 100;

// Track spawned child processes that are not manager/mm instances
const spawnedProcesses: ChildProcess[] = [];

After({ tags: "@aggregation-repro-cleanup" }, async function (this: CustomWorld) {
    // Kill all spawned hubs
    for (const proc of spawnedProcesses) {
        if (proc.pid) {
            try {
                proc.kill("SIGTERM");
            } catch { /* ignore */ }
        }
    }
    spawnedProcesses.length = 0;

    // Kill MultiManager
    if (this.resources.aggMMProcess) {
        try {
            this.resources.aggMMProcess.kill("SIGTERM");
        } catch { /* ignore */ }
        delete this.resources.aggMMProcess;
    }

    // Clean up temp dirs
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
    env: Record<string, string> = {}
): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
        const fullCmd = [...cmd, ...options];
        const proc = spawn("/usr/bin/env", fullCmd, { detached: false, env: { ...process.env, ...env } });

        const timer = setTimeout(() => {
            if (proc.pid) {
                try {
                    proc.kill("SIGTERM");
                } catch { /* ignore */ }
            }
            reject(new Error(`Timeout waiting for process to be ready (${readyMatch || "no pattern"})`));
        }, timeout);

        if (readyMatch) {
            proc.stdout?.on("data", (data: Buffer) => {
                const text = data.toString();

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

        if (process.env.SCRAMJET_TEST_LOG) {
            proc.stdout?.pipe(process.stdout);
            proc.stderr?.pipe(process.stderr);
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

// =========================================================================
// Background steps
// =========================================================================

Given("a MultiManager with name {string} and id {string}", { timeout: 30000 }, async function (
    this: CustomWorld,
    name: string,
    id: string
) {
    const mmPort = BASE_PORT;
    const mmOptions = [
        `--id=${id}`,
        `--server-api-port=${mmPort}`,
        "--host=0.0.0.0",
        `--verser2-host-bind-port=${VERSER2_PORT}`,
        "--verser2-host-bind-host=0.0.0.0",
        `--verser2-host-public-url=https://127.0.0.1:${VERSER2_PORT}`,
        "--verser2-allow-local-peers=true",
        `--verser2-host-identity-dir=/tmp/repro-verser2-mm-${id}`,
        "--log-level=INFO",
    ];

    const cmd = getExecutableCmd("multi-manager");
    const proc = await spawnProcess(cmd, mmOptions);

    this.resources.aggMMProcess = proc;
    this.resources.aggMMId = id;
    this.resources.aggMMApiBase = `http://0.0.0.0:${mmPort}/api/v1`;
    this.resources.aggMMClient = new MultiManagerClient(this.resources.aggMMApiBase);

    await waitForGet(this.resources.aggMMApiBase, "version", 20_000);
});

Given("a Manager with id {string} is started on the MultiManager", { timeout: 20000 }, async function (
    this: CustomWorld,
    managerId: string
) {
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

    const response = await mmClient.startManager(managerConfig);

    assert.ok(response, "Expected Manager to be started");

    // Fetch verser2 trust material
    const client = new ClientUtils(this.resources.aggMMApiBase);
    let trustMaterial: any;

    try {
        trustMaterial = await client.get<any>(`verser2/trust/${managerId}`);
    } catch (e) {
        // Manager might not expose trust endpoint yet – that's OK for repro
        console.log("Note: could not fetch verser2 trust material:", (e as Error).message);
    }

    this.resources.aggManagerId = managerId;
    this.resources.aggManagerClient = mmClient.getManagerClient(managerId);
    if (trustMaterial?.ca) {
        this.resources.aggVerser2CA = trustMaterial.ca;
    }
});

Given("an STH hub {string} is connected to Manager {string} with sequences-root {string}", {
    timeout: 60000
}, async function (
    this: CustomWorld,
    hubName: string,
    managerId: string,
    sequencesRoot: string
) {
    const apiPort = await freeport();
    const instancesPort = await freeport();
    const runnerHostPort = await freeport();
    const hubDir = `/tmp/repro-hub-${hubName}`;
    const configPath = `${hubDir}/sth-config.json`;

    if (!existsSync(hubDir)) {
        mkdirSync(hubDir, { recursive: true });
    }

    const cwd = getRepoRoot();
    const sequencesRootAbsolute = resolve(cwd, sequencesRoot);
    const startupConfigAbsolute = resolve(cwd, `repro/manager-aggregation/startup/${hubName}.json`);
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
                registration: {
                    allowLocalPeers: true,
                },
                localBroker: {
                    peerId: `sth.${hubName}.runner.broker`,
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
        `--verser2-host-url=https://127.0.0.1:${VERSER2_PORT}`,
        `--verser2-guest-peer-id=sth.${hubName}.guest`,
        `--verser2-guest-route-domain=sth.${hubName}.scramjet.internal`,
        `--verser2-broker-peer-id=sth.${hubName}.broker`,
        `--verser2-broker-target-domain=manager.${managerId}.scramjet.internal`,
    ];

    // If we have verser2 CA, pass it
    if (this.resources.aggVerser2CA) {
        const caPath = `/tmp/repro-verser2-ca-${hubName}.pem`;

        writeFileSync(caPath, this.resources.aggVerser2CA);
        hubOpts.push(`--verser2-ca-file=${caPath}`);
    }

    try {
        const proc = await spawnProcess(cmd, hubOpts, undefined, 15_000, {
            SCRAMJET_VERSER2_RUNNER_HOST_BIND_PORT: String(runnerHostPort),
        });
        const apiBase = `http://127.0.0.1:${apiPort}/api/v1`;

        await waitForGet(apiBase, "version", 30_000);

        spawnedProcesses.push(proc);

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
        console.log(`Warning: hub ${hubName} may not have started (verser2 may not be reachable):`, (e as Error).message);
        // For the repro, it's OK if the hub can't connect to Manager via verser2
        // The test will still demonstrate that the proxy returns empty
    }
});

Given("I wait for hubs to register with the Manager", { timeout: 15000 }, async function (
    this: CustomWorld
) {
    // Wait for hubs to potentially register via verser2
    await sleep(3000);
});

// =========================================================================
// When steps
// =========================================================================

When("I query the Manager {string} through the MultiManager proxy", async function (
    this: CustomWorld,
    endpoint: string
) {
    const mmClient = this.resources.aggMMClient as MultiManagerClient;
    const managerId = this.resources.aggManagerId as string;
    const clientUtils = new ClientUtils(mmClient.apiBase);

    try {
        const response = await clientUtils.get<any>(
            `cpm/${managerId}/api/v1${endpoint}`
        );

        this.resources.aggProxyResponse = response;
        this.resources.aggProxyError = null;
    } catch (e) {
        this.resources.aggProxyResponse = null;
        this.resources.aggProxyError = e;
    }
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

// =========================================================================
// Then steps
// =========================================================================

Then("the Manager proxy response should contain at least {int} items", function (this: CustomWorld, minCount: number) {
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
