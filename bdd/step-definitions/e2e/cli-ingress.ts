import { After, Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { createServer, type Server } from "http";
import { existsSync, readFileSync, symlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { createVerserHost } from "@signicode/verser2-host";
import { createV2HttpDispatcher } from "@scramjet/api-server";
import { Router } from "@scramjet/api-router";
import { CustomWorld } from "../world";
import { cleanupCliIngress, ingressState, invoke, startCli, startMtlsIngresses, type CliResult, type IngressName, type IngressState, type ProfileName } from "../../lib/cli-ingress-fixture";
import { resolveBddCliArtifact } from "../../lib/published-artifacts";

function profile(
    endpoint: string,
    ingress: { level: "platform" | "space" | "hub"; serviceId: string; routeDomain: string },
    tls: { caFile: string; certFile?: string; keyFile?: string },
    target?: { spaceId?: string; hubId?: string }
) {
    return {
        configVersion: 1,
        apiUrl: "http://127.0.0.1:1/api/v1",
        middlewareApiUrl: "",
        env: "development",
        scope: "",
        token: "",
        log: { debug: false, format: "pretty" },
        verser2: {
            endpoint,
            brokerId: `bdd-${ingress.level}-cli`,
            ingress: { level: ingress.level, expectedId: ingress.serviceId, routeDomain: ingress.routeDomain },
            target,
            tls,
            timeoutMs: 5000
        }
    };
}

function versionRouter(name: IngressName, state: IngressState, identity: { level: string; serviceId: string; routeDomain: string }, namedPath?: string) {
    let router = Router.create({ basePath: "/api/v2" })
        .get("/ingress/identity", { handler: () => identity })
        .get("/version", { handler: () => { state.requests[name]++; return { ingress: name, request: "raw" }; } });
    if (namedPath) {
        router = router.get(namedPath, { handler: () => { state.requests[name]++; return { ingress: name, request: "named" }; } });
    }
    return router;
}

function requireProfile(world: CustomWorld, name: ProfileName): string {
    const profilePath = ingressState(world).profiles[name];
    assert.ok(profilePath, `${name} profile was not created`);
    return profilePath;
}

function remember(world: CustomWorld, result: CliResult): void {
    ingressState(world).result = result;
}

function waitFor(condition: () => boolean, description: string, timeoutMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + timeoutMs;
        const timer = setInterval(() => {
            if (condition()) {
                clearInterval(timer);
                resolve();
            } else if (Date.now() >= deadline) {
                clearInterval(timer);
                reject(new Error(`Timed out waiting for ${description}`));
            }
        }, 20);
    });
}

After(async function(this: CustomWorld) {
    if (!this.resources.cliIngress) return;
    try {
        await cleanupCliIngress(this);
    } finally {
        delete this.resources.cliIngress;
    }
});

async function collectRequestBody(request: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    return Buffer.concat(chunks).toString("binary");
}

async function startNativeFixture(world: CustomWorld): Promise<void> {
    const isolation = world.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must be installed before creating ingress fixtures");
    const state = ingressState(world);
    const tls = await isolation.createMtlsControlIngress();
    const host = createVerserHost({
        hostId: "bdd-native-cli-host",
        host: "127.0.0.1",
        port: tls.port,
        tls: { certFile: tls.server.tls.certFile, keyFile: tls.server.tls.keyFile }
    });
    await host.start();
    const guest = await host.attachLocalGuest({
        guestId: "bdd.native.cli.guest",
        routedDomains: ["bdd.native.cli.test"],
        listener: async (request, response) => {
            const path = new URL(request.url || "/", "http://bdd.native").pathname;
            state.nativeActiveRequests++;
            try {
                if (path === "/api/v2/wait") {
                    state.nativeWaitStarted = true;
                    request.once("close", () => {
                        state.nativeActiveRequests--;
                    });
                    return;
                }
                const body = await collectRequestBody(request);
                if (path !== "/api/v2/ingress/identity") state.nativeRequests.push({ path, body });
                if (path === "/api/v2/ingress/identity") {
                    response.writeHead(200, { "content-type": "application/json" });
                    response.end(JSON.stringify({ level: "hub", serviceId: "native-hub", routeDomain: "bdd.native.cli.test" }));
                } else if (path === "/api/v2/stream") {
                    response.writeHead(200, { "content-type": "application/octet-stream" });
                    response.end("streamed-output");
                } else if (path === "/api/v2/missing") {
                    response.writeHead(404, { "content-type": "text/plain" });
                    response.end("missing fixture");
                } else {
                    response.writeHead(200, { "content-type": "application/json" });
                    response.end(JSON.stringify({ ok: true, path }));
                }
            } finally {
                if (path !== "/api/v2/wait") state.nativeActiveRequests--;
            }
        }
    });
    state.close.push(async () => {
        await guest.close("bdd cleanup").catch(() => undefined);
        await host.close().catch(() => undefined);
    });
    state.profiles.native = isolation.writeProfile("native", profile(tls.publicUrl, { level: "hub", serviceId: "native-hub", routeDomain: "bdd.native.cli.test" }, { caFile: tls.allowedClient.caFile }));
}

function closeServer(server: Server): Promise<void> {
    return new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

Given("real CLI mTLS profiles for platform, Space, and Hub ingress", async function(this: CustomWorld) {
    await startMtlsIngresses(this);
});

When("the real CLI uses the persisted platform profile for raw and named version requests", async function(this: CustomWorld) {
    remember(this, await invoke(this, ["api", "get", "/version"]));
    assert.strictEqual(ingressState(this).result?.code, 0, ingressState(this).result?.output);
    remember(this, await invoke(this, ["space", "version"]));
    assert.strictEqual(ingressState(this).result?.code, 0, ingressState(this).result?.output);
});

When("the real CLI uses the selected Space profile for raw and named version requests", async function(this: CustomWorld) {
    const selected = requireProfile(this, "space");
    remember(this, await invoke(this, ["-c", selected, "api", "get", "/version"]));
    assert.strictEqual(ingressState(this).result?.code, 0, ingressState(this).result?.output);
    remember(this, await invoke(this, ["-c", selected, "hub", "version"]));
    assert.strictEqual(ingressState(this).result?.code, 0, ingressState(this).result?.output);
});

When("the real CLI uses the selected Hub profile for raw and named version requests", async function(this: CustomWorld) {
    const selected = requireProfile(this, "hub");
    remember(this, await invoke(this, ["-c", selected, "api", "get", "/version"]));
    assert.strictEqual(ingressState(this).result?.code, 0, ingressState(this).result?.output);
    remember(this, await invoke(this, ["-c", selected, "hub", "version"]));
    assert.strictEqual(ingressState(this).result?.code, 0, ingressState(this).result?.output);
});

Then("each mTLS ingress receives its two selected CLI requests", function(this: CustomWorld) {
    const requests = ingressState(this).requests;
    assert.deepStrictEqual({ platform: requests.platform, space: requests.space, hub: requests.hub }, { platform: 2, space: 2, hub: 2 });
});

When("the real CLI attempts to traverse upstream from the Hub profile", async function(this: CustomWorld) {
    remember(this, await invoke(this, ["-c", requireProfile(this, "hub"), "api", "get", "/spaces/space-a/version"]));
});

When("the real CLI uses a rejected mTLS credential", async function(this: CustomWorld) {
    remember(this, await invoke(this, ["-c", requireProfile(this, "rejected"), "api", "get", "/version"]));
});

When("the real CLI uses a profile with a missing credential", async function(this: CustomWorld) {
    remember(this, await invoke(this, ["-c", requireProfile(this, "missing"), "api", "get", "/version"]));
});

Then("the real CLI exits with code {int}", function(this: CustomWorld, expected: number) {
    const result = ingressState(this).result;
    assert.strictEqual(result?.code, expected, result?.output);
});

Then("the real CLI exits with one of codes {string}", function(this: CustomWorld, expected: string) {
    const result = ingressState(this).result;
    const allowed = expected.split(",").map(Number);
    assert.ok(allowed.includes(result?.code || -1), `Expected one of ${expected}, got ${result?.code}. Output:\n${result?.output}`);
});

Then("the Hub ingress receives no additional request", function(this: CustomWorld) {
    assert.strictEqual(ingressState(this).requests.hub, 2);
});

Then("the Space ingress receives no additional request", function(this: CustomWorld) {
    assert.strictEqual(ingressState(this).requests.space, 2);
});

Given("a real CLI non-mTLS Hub ingress profile", async function(this: CustomWorld) {
    const isolation = this.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must be installed before creating ingress fixtures");
    const state = ingressState(this);
    const tls = await isolation.createMtlsControlIngress();
    const host = createVerserHost({
        hostId: "bdd-nonmtls-host",
        host: "127.0.0.1",
        port: tls.port,
        tls: { certFile: tls.server.tls.certFile, keyFile: tls.server.tls.keyFile }
    });
    await host.start();
    const guest = await host.attachLocalGuest({
        guestId: "bdd.nonmtls.guest",
        routedDomains: ["bdd.nonmtls.test"],
        listener: createV2HttpDispatcher(versionRouter("nonmtls", state, { level: "hub", serviceId: "hub-nonmtls", routeDomain: "bdd.nonmtls.test" })).listener as any
    });
    state.close.push(async () => {
        await guest.close("bdd cleanup").catch(() => undefined);
        await host.close().catch(() => undefined);
    });
    state.profiles.nonmtls = isolation.writeProfile("nonmtls", profile(tls.publicUrl, { level: "hub", serviceId: "hub-nonmtls", routeDomain: "bdd.nonmtls.test" }, { caFile: tls.allowedClient.caFile }));
});

When("the real CLI uses the non-mTLS profile for raw and named version requests", async function(this: CustomWorld) {
    remember(this, await invoke(this, ["api", "get", "/version"]));
    assert.strictEqual(ingressState(this).result?.code, 0, ingressState(this).result?.output);
    remember(this, await invoke(this, ["hub", "version"]));
    assert.strictEqual(ingressState(this).result?.code, 0, ingressState(this).result?.output);
});

Then("the non-mTLS Hub ingress receives two selected CLI requests", function(this: CustomWorld) {
    assert.strictEqual(ingressState(this).requests.nonmtls, 2);
});

When("the real CLI attempts to traverse upstream from the non-mTLS Hub profile", async function(this: CustomWorld) {
    remember(this, await invoke(this, ["api", "get", "/spaces/space-a/version"]));
});

Then("the non-mTLS Hub ingress receives no additional request", function(this: CustomWorld) {
    assert.strictEqual(ingressState(this).requests.nonmtls, 2);
});

When("two real CLI completion commands run against isolated session storage", async function(this: CustomWorld) {
    const isolation = this.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must be installed before invoking the CLI");
    const completionRoot = isolation.createArtifactDirectory("completion-cli");
    const cliArtifact = resolveBddCliArtifact();
    symlinkSync(cliArtifact.packageDir, join(completionRoot, "cli"), "dir");
    symlinkSync(cliArtifact.nodeModulesDir, join(completionRoot, "node_modules"), "dir");
    symlinkSync(cliArtifact.scriptsDir, join(completionRoot, "scripts"), "dir");
    const completionCli = ["node", "--preserve-symlinks", "--preserve-symlinks-main", join(completionRoot, "cli", cliArtifact.binRelativePath)];
    const first = await invoke(this, ["completion"], {}, completionCli);
    const second = await invoke(this, ["completion"], {}, completionCli);
    ingressState(this).completionResults = [first, second];
});

Then("both real CLI completion commands succeed", function(this: CustomWorld) {
    const results = ingressState(this).completionResults;
    assert.ok(results && results.length === 2, "completion results were not recorded");
    for (const result of results) assert.strictEqual(result.code, 0, result.output);
});

Then("each completion output contains the bundled completion script", function(this: CustomWorld) {
    const results = ingressState(this).completionResults || [];
    for (const result of results) assert.match(result.output, /_si_completion/);
});

Then("the isolated CLI profile state is valid JSON", function(this: CustomWorld) {
    const isolation = this.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation is unavailable");
    const profilePath = join(isolation.profilesDir, "default.json");
    assert.ok(existsSync(profilePath), "completion did not create the isolated default profile");
    assert.doesNotThrow(() => JSON.parse(readFileSync(profilePath, "utf8")));
});

Given("a real CLI native ingress fixture profile", async function(this: CustomWorld) {
    await startNativeFixture(this);
});

When("the real CLI sends raw and named version commands through the native ingress", async function(this: CustomWorld) {
    remember(this, await invoke(this, ["api", "get", "/version"]));
    assert.strictEqual(ingressState(this).result?.code, 0, ingressState(this).result?.output);
    remember(this, await invoke(this, ["hub", "version"]));
    assert.strictEqual(ingressState(this).result?.code, 0, ingressState(this).result?.output);
});

Then("the native ingress records raw and named version dispatch", function(this: CustomWorld) {
    const paths = ingressState(this).nativeRequests.map(request => request.path);
    assert.deepStrictEqual(paths, ["/api/v2/version", "/api/v2/version"]);
});

Then("the native ingress has no active requests", function(this: CustomWorld) {
    assert.strictEqual(ingressState(this).nativeActiveRequests, 0);
});

When("the real CLI sends JSON and file raw API bodies through the native ingress", async function(this: CustomWorld) {
    const isolation = this.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation is unavailable");
    const inputPath = join(isolation.artifactsDir, "input.bin");
    writeFileSync(inputPath, Buffer.from([3, 4]));
    remember(this, await invoke(this, ["api", "post", "/json", "--no-confirm", "--json", "{\"value\":1}"]));
    assert.strictEqual(ingressState(this).result?.code, 0, ingressState(this).result?.output);
    remember(this, await invoke(this, ["api", "put", "/file", "--no-confirm", "--file", inputPath]));
    assert.strictEqual(ingressState(this).result?.code, 0, ingressState(this).result?.output);
});

Then("the native ingress receives the JSON and file bodies", function(this: CustomWorld) {
    const requests = ingressState(this).nativeRequests;
    assert.deepStrictEqual(requests.map(request => [request.path, request.body]), [
        ["/api/v2/json", "{\"value\":1}"],
        ["/api/v2/file", "\u0003\u0004"]
    ]);
});

When("the real CLI streams a raw API response through the native ingress", async function(this: CustomWorld) {
    remember(this, await invoke(this, ["api", "get", "/stream", "--stream"]));
    assert.strictEqual(ingressState(this).result?.code, 0, ingressState(this).result?.output);
});

Then("the real CLI output contains {string}", function(this: CustomWorld, expected: string) {
    assert.ok(ingressState(this).result?.output.includes(expected), `Expected CLI output to contain ${expected}:\n${ingressState(this).result?.output}`);
});

When("the real CLI receives a native API error response", async function(this: CustomWorld) {
    remember(this, await invoke(this, ["api", "get", "/missing"]));
});

When("the real CLI is interrupted during a native ingress request", async function(this: CustomWorld) {
    const running = startCli(this, ["api", "get", "/wait"]);
    await waitFor(() => ingressState(this).nativeWaitStarted, "native ingress request handoff");
    running.child.kill("SIGINT");
    remember(this, await running.result);
});

Then("the native ingress releases the interrupted request", async function(this: CustomWorld) {
    await waitFor(() => ingressState(this).nativeActiveRequests === 0, "interrupted native ingress request cleanup");
});

Given("a real CLI legacy HTTP profile fixture", async function(this: CustomWorld) {
    const isolation = this.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must be installed before creating fixture server");
    const state = ingressState(this);
    const port = await isolation.reservePort();
    const server = createServer((_request, response) => {
        state.legacyRequests++;
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ version: "bdd-v1-fixture" }));
    });
    await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", resolve);
    });
    state.close.push(() => closeServer(server).catch(() => undefined));
    isolation.writeProfile("legacy", {
        configVersion: 1,
        apiUrl: `http://127.0.0.1:${port}/api/v1`,
        middlewareApiUrl: "",
        env: "development",
        scope: "",
        token: "",
        log: { debug: false, format: "pretty" }
    });
});

When("the real CLI requests the Hub version through the legacy profile", async function(this: CustomWorld) {
    remember(this, await invoke(this, ["hub", "version"]));
});

Then("the legacy HTTP fixture receives one request", function(this: CustomWorld) {
    assert.strictEqual(ingressState(this).legacyRequests, 1);
});
