import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import { request as httpRequest } from "http";
import { promisify } from "util";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { spawn } from "child_process";
import { createVerserBroker, type VerserBroker } from "@signicode/verser2-guest-node";
import { getSiCommand } from "../../lib/utils";
import { CustomWorld } from "../world";

const freeport = promisify(require("freeport"));
const si = getSiCommand({ useBddConfig: false });
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type RpcState = { broker?: VerserBroker; profile?: string; result?: { code: number | null; stdout?: string; stderr?: string; out?: string }; receipts?: Array<{ id: string; body: string }>; expectedIds?: string[]; arrival17?: boolean; requestId?: string; requestBody?: string };
function state(world: CustomWorld): RpcState {
    return (world.resources.siRpcState ||= {}) as RpcState;
}

function request(url: string, method = "GET", body?: string, timeoutMs = 3000): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback: () => void) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            callback();
        };
        const req = httpRequest(url, { method, headers: body === undefined ? {} : { "content-type": "text/plain" } }, response => {
            const chunks: Buffer[] = [];
            response.on("data", chunk => chunks.push(Buffer.from(chunk)));
            response.on("error", error => finish(() => reject(error)));
            response.on("end", () => finish(() => resolve({ status: response.statusCode || 0, body: Buffer.concat(chunks).toString() })));
        });
        const timer = setTimeout(() => req.destroy(new Error(`Observer request timed out after ${timeoutMs}ms: ${method} ${url}`)), timeoutMs);
        req.on("error", error => finish(() => reject(error)));
        if (body !== undefined) req.write(body);
        req.end();
    });
}

function observerUrl(world: CustomWorld, path: string): string {
    return `http://127.0.0.1:${world.resources.aggColdRpcObserverPort}${path}`;
}

function managerRpcPath(world: CustomWorld, id: string): string {
    const hubId = String(world.resources.aggHubId || "hub-rpc");
    const instanceId = String(world.resources.aggRpcInstanceId || "hub-rpc-api-main");
    return `/api/v2/hubs/${encodeURIComponent(hubId)}/instances/${encodeURIComponent(instanceId)}/rpc/test/rpc/${encodeURIComponent(id)}`;
}

async function responseText(response: any): Promise<string> {
    let text = "";
    for await (const chunk of response.body) text += Buffer.isBuffer(chunk) ? chunk.toString() : String(chunk);
    return text;
}

Given("cold instance RPC observation is enabled for the aggregation stack", async function(this: CustomWorld) {
    this.resources.aggSkipRpcReadinessProbe = true;
    this.resources.aggColdRpcObserverPort = await freeport();
});

Then("the hub v1 registration is visible in v2 inventory and health", async function(this: CustomWorld) {
    const base = String((this.resources.aggMMClient as any).apiBase);
    const id = encodeURIComponent(String(this.resources.aggManagerId));
    const v1 = await request(`${base}/cpm/${id}/api/v1/list`);
    assert.equal(v1.status, 200, `v1 Hub registration failed: HTTP ${v1.status}`);
    const hubs = JSON.parse(v1.body);
    assert.ok(hubs.some((hub: any) => hub.id === "hub-rpc"), `Expected v1 hub-rpc registration, got ${v1.body}`);
    const inventory = await request(`${base}/cpm/${id}/api/v2/hubs`);
    assert.equal(inventory.status, 200, `v2 inventory failed: HTTP ${inventory.status}`);
    const items = JSON.parse(inventory.body).items || [];
    assert.ok(items.some((hub: any) => hub.id === "hub-rpc"), `v2 inventory omitted v1 registration: ${inventory.body}`);
    const health = await request(`${base}/cpm/${id}/api/v2/health`);
    assert.equal(health.status, 200, `v2 health failed: HTTP ${health.status}`);
    const healthInfo = JSON.parse(health.body);
    const aggregationComponent = healthInfo.components?.find((component: any) => component.name === "manager.aggregation");
    const aggregation = healthInfo.details?.aggregation;
    const hub = aggregation?.byHub?.find((row: any) => row.id === "hub-rpc");
    assert.ok(aggregationComponent, `v2 health omitted manager.aggregation component: ${health.body}`);
    assert.equal(aggregationComponent.healthy, true, `Manager aggregation health component is not healthy: ${health.body}`);
    assert.equal(aggregationComponent.status, "healthy", `Manager aggregation health status is not healthy: ${health.body}`);
    assert.equal(aggregation?.ready, true, `Manager aggregation readiness is false: ${health.body}`);
    assert.ok(hub, `Manager aggregation health omitted the hub-rpc row: ${health.body}`);
    assert.equal(hub.active, true, `hub-rpc is not active in Manager aggregation health: ${health.body}`);
    assert.equal(hub.inventoryConsumed, true, `hub-rpc inventory was not consumed: ${health.body}`);
    assert.equal(hub.healthy, true, `hub-rpc is not healthy: ${health.body}`);
});

Then("no RPC has arrived at the target instance", async function(this: CustomWorld) {
    let observed: { status: number; body: string } | undefined;
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
        try {
            observed = await request(observerUrl(this, "/receipts"));
            if (observed.status === 200) break;
        } catch {
            await pause(50);
        }
    }
    assert.ok(observed, "Target-side observer did not become available");
    assert.equal(observed.status, 200);
    const receipts = JSON.parse(observed.body);
    assert.deepEqual(receipts, [], "Target received an RPC before the asserted cold-path call");
});

When("I configure the real si CLI for the aggregation Manager ingress", async function(this: CustomWorld) {
    const s = state(this);
    const managerId = String(this.resources.aggManagerId);
    const tlsPath = resolve(String(this.resources.aggTempDir), "verser2-ca.pem");
    writeFileSync(tlsPath, String(this.resources.aggVerser2CA || ""), { mode: 0o600 });
    s.profile = this.scenarioIsolation!.writeProfile("verser2-e2e-manager", {
        configVersion: 1,
        apiUrl: "http://127.0.0.1:1/api/v1",
        middlewareApiUrl: "",
        env: "development",
        scope: "",
        token: "",
        log: { debug: false, format: "pretty" },
        verser2: {
            endpoint: `https://127.0.0.1:${this.resources.aggVerser2Port}`,
            brokerId: `bdd-si-${managerId}`,
            ingress: { level: "space", expectedId: managerId, routeDomain: `manager.${managerId}.scramjet.internal` },
            tls: { caFile: tlsPath },
            timeoutMs: 12000
        }
    });
});

When("the real si CLI posts one unique instance RPC request", { timeout: 30000 }, async function(this: CustomWorld) {
    const id = `si-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const body = `body-${id}`;
    state(this).requestId = id;
    state(this).requestBody = body;
    const args = ["-c", state(this).profile!, "api", "post", managerRpcPath(this, id), "--no-confirm", "--stdin"];
    const child = spawn("/usr/bin/env", [...si, ...args], { env: this.scenarioIsolation!.environment() });
    this.scenarioLifecycle.ownChild(child, "si manager to instance RPC", { group: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => stdout += chunk.toString());
    child.stderr.on("data", chunk => stderr += chunk.toString());
    child.stdin.end(body);
    const code = await new Promise<number | null>((resolve, reject) => {
        const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error("si RPC command timed out")); }, 25000);
        child.once("error", reject);
        child.once("close", value => { clearTimeout(timer); resolve(value); });
    });
    state(this).result = { code, stdout, stderr };
});

Then("the target instance records that unique RPC and the CLI receives its exact response", { timeout: 15000 }, async function(this: CustomWorld) {
    const saved = state(this).result;
    assert.ok(saved, "si command did not complete");
    assert.equal(saved.code, 0, `si exited ${saved.code}; stdout=${saved.stdout || ""}; stderr=${saved.stderr || ""}`);
    const id = state(this).requestId!;
    const body = state(this).requestBody!;
    const expected = `receipt:${id}:${body}`;
    // The CLI emits the raw response bytes; allow only one conventional final newline if present.
    const responseBody = (saved.stdout || "").replace(/\r?\n$/, "");
    assert.equal(responseBody, expected, `si stdout did not exactly match target response; stderr=${saved.stderr || ""}`);
    const observed = await request(observerUrl(this, "/receipts"));
    const receipts = JSON.parse(observed.body);
    assert.deepEqual(receipts, [{ id, body }], "Target-side RPC arrival was not unique and exact");
});

When("I configure a real BDD Broker for the aggregation Manager ingress", async function(this: CustomWorld) {
    const managerId = String(this.resources.aggManagerId);
    const broker = createVerserBroker({
        hostUrl: `https://127.0.0.1:${this.resources.aggVerser2Port}`,
        brokerId: `bdd-capacity-${managerId}`,
        tls: { ca: String(this.resources.aggVerser2CA || "") }
    });
    state(this).broker = broker;
    await broker.connect();
    await broker.waitForRoute(`manager.${managerId}.scramjet.internal`);
});

When("the target instance holds RPC responses and the Broker sends 17 unique requests", { timeout: 30000 }, async function(this: CustomWorld) {
    const s = state(this);
    await request(observerUrl(this, "/gate"), "POST", "hold");
    const managerId = String(this.resources.aggManagerId);
    const domain = `manager.${managerId}.scramjet.internal`;
    const routes = s.broker!.getRoutes().filter(route => route.domain === domain);
    assert.equal(routes.length, 1, `Expected one Manager control route, got ${JSON.stringify(routes)}`);
    const targetId = routes[0].targetId;
    const ids = Array.from({ length: 17 }, (_, index) => `pool-${Date.now()}-${index}`);
    s.expectedIds = ids;
    const calls = ids.map(async id => {
        const result = await s.broker!.request({ targetId, method: "POST", path: managerRpcPath(this, id), headers: { "content-type": "text/plain" }, body: [Buffer.from(`body-${id}`)] });
        return { id, status: result.statusCode, body: await responseText(result) };
    });
    const outcomesPromise = Promise.allSettled(calls);
    try {
        const deadline = Date.now() + 10000;
        let arrivals: any[] = [];
        while (Date.now() < deadline) {
            const observed = await request(observerUrl(this, "/receipts"));
            arrivals = JSON.parse(observed.body);
            if (arrivals.length >= 17) break;
            await pause(50);
        }
        s.receipts = arrivals;
        s.arrival17 = arrivals.length >= 17;
    } finally {
        await request(observerUrl(this, "/gate"), "POST", "release").catch(() => undefined);
    }
    const outcomes = await outcomesPromise;
    s.result = {
        code: outcomes.every(item => item.status === "fulfilled" && item.value.status === 200) ? 0 : 1,
        out: JSON.stringify(outcomes.map((item, index) => item.status === "fulfilled" ? item.value : { id: ids[index], error: String(item.reason) }))
    };
});

Then("the target instance receives request 17 before held responses are released", function(this: CustomWorld) {
    const s = state(this);
    assert.equal(s.arrival17, true, `Target saw ${s.receipts?.length || 0}/17 requests before release; completions=${s.result?.out}`);
    assert.deepEqual(new Set(s.receipts?.map(item => item.id)), new Set(s.expectedIds), "Target-side arrivals were not the exact 17 unique request IDs");
    assert.deepEqual(s.receipts?.map(item => item.body).sort(), s.expectedIds?.map(id => `body-${id}`).sort());
});

Then("all 17 RPC responses exactly match their request identities", function(this: CustomWorld) {
    const outcomes = JSON.parse(state(this).result?.out || "[]");
    assert.equal(outcomes.length, 17, `Expected 17 completion records, got ${outcomes.length}`);
    for (const item of outcomes) {
        assert.equal(item.status, 200, `RPC ${item.id} failed: ${item.error || item.status}`);
        assert.equal(item.body, `receipt:${item.id}:body-${item.id}`);
    }
});

After(async function(this: CustomWorld) {
    const s = this.resources.siRpcState as RpcState | undefined;
    if (this.resources.aggColdRpcObserverPort) {
        await request(observerUrl(this, "/gate"), "POST", "release").catch(() => undefined);
    }
    await s?.broker?.close("BDD scenario cleanup").catch(() => undefined);
    delete this.resources.siRpcState;
    delete this.resources.aggSkipRpcReadinessProbe;
    delete this.resources.aggColdRpcObserverPort;
});
