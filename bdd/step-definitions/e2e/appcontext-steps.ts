import { Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { CustomWorld } from "../world";
import http from "http";
import { createReadStream } from "fs";
import { isTransientReadinessStatus } from "../../lib/readiness-contract";
import { HostClient } from "@scramjet/api-client";
const { createAppContextRpcFixture } = require("../../lib/appcontext-rpc-fixture.js");

/**
 * AppContext-specific step definitions for BDD fixture validation.
 *
 * Kept scoped to assertions not already covered by host-steps.ts.
 * Prefer reusing existing steps where possible.
 */

/**
 * Send an HTTP GET request to an instance's exposed API endpoint.
 * The URL is constructed from the instance's base URL.
 */
When("I send GET request to instance endpoint {string}", { timeout: 10000 }, async function (this: CustomWorld, endpointPath: string) {
    const instance = this.resources.instance;

    if (!instance) {
        assert.fail("No active instance");
    }

    // The instance client knows the base API URL.  We derive the exposed
    // endpoint URL from it.  The pattern is:
    //   http://<host>:<port>/api/v1/instance/<id>/rpc/<path>
    // The instance client stores its base URL internally; we reconstruct it.
    const instInfo = await instance.getInfo();

    // getInfo() returns instance info from the API; we extract the API base
    // from the instance URL used by the client.  InstanceClient stores URL as
    // `instance/<id>` relative to the host API base.
    // The host API base is available from the host client.
    const apiBase = (process.env.LOCAL_HOST_BASE_URL || "http://127.0.0.1:8000/api/v1").replace(/\/+$/, "");

    const instId = instInfo?.id ?? (instance as any).id;

    // Construct the expose endpoint URL.
    const exposeUrl = `${apiBase.replace(/\/+$/, "")}/instance/${instId}/rpc${endpointPath.startsWith("/") ? "" : "/"}${endpointPath}`;

    const request = () => new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = http.get(exposeUrl, { agent: false }, (res) => {
            let body = "";

            res.on("data", (chunk: Buffer) => { body += chunk.toString("utf8"); });
            res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
            res.on("error", reject);
        });

        req.on("error", reject);
        req.setTimeout(5000, () => {
            req.destroy(new Error(`Request to ${exposeUrl} timed out`));
        });
    });

    const deadline = Date.now() + 5000;
    let response = await request();
    while (isTransientReadinessStatus(response.status) && Date.now() < deadline) {
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
        response = await request();
    }
    this.resources.appcontextExposeResponse = response;
});

When("I verify the hosted {string} author identity through raw RPC", { timeout: 10000 }, async function (this: CustomWorld, expectedRuntime: string) {
    const instance = this.resources.instance;
    assert.ok(instance, "No active instance");
    const info = await instance.getInfo();
    const instanceId = info?.id ?? (instance as any).id;
    assert.ok(instanceId, "Active instance has no id");
    const apiBase = (process.env.LOCAL_HOST_BASE_URL || "http://127.0.0.1:8000/api/v1").replace(/\/+$/, "");
    const url = `${apiBase}/instance/${encodeURIComponent(instanceId)}/rpc/identity`;
    const requestBody = JSON.stringify({ token: "hosted-parity-token" });
    const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = http.request(url, { method: "POST", agent: false, headers: { "content-type": "application/json", "content-length": Buffer.byteLength(requestBody) } }, res => {
            let body = "";
            res.on("data", (chunk: Buffer) => { body += chunk.toString("utf8"); });
            res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
            res.on("error", reject);
        });
        req.on("error", reject);
        req.setTimeout(5000, () => req.destroy(new Error(`Request to ${url} timed out`)));
        req.end(requestBody);
    });
    assert.equal(response.status, 200, `Expected raw RPC status 200, got ${response.status}: ${response.body}`);
    const payload = JSON.parse(response.body);
    assert.deepEqual(payload.stages.map((stage: any) => stage.stage), ["load", "initialize", "main", "callback", "http"]);
    assert.ok(payload.stages[1].declaration, "Initialization-time API declaration was not returned");
    assert.equal(payload.stages[2].argument, "hosted-parity-token", "Sequence argument was not delivered to main");
    assert.ok(payload.stages[2].contextConfig && typeof payload.stages[2].contextConfig === "object", "AppContext config was not available in main");
    const pids = new Set(payload.stages.map((stage: any) => stage.pid));
    assert.equal(pids.size, 1, `Sequence author lifecycle stages ran in different processes: ${response.body}`);
    for (const stage of payload.stages) {
        assert.ok(Number.isInteger(stage.pid) && stage.pid > 0, `Process id missing at ${stage.stage}`);
        assert.equal(stage.runtime, expectedRuntime, `Expected native ${expectedRuntime} at ${stage.stage}; got ${stage.runtime} (${stage.version})`);
        assert.equal(typeof stage.version, "string");
        assert.ok(stage.version.length > 0, `Runtime version missing at ${stage.stage}`);
    }
    this.resources.appcontextBunIdentity = payload;
});

/**
 * Assert that the last exposed API response has a specific status code.
 */
Then("response status is {int}", async function (this: CustomWorld, expectedStatus: number) {
    const response = this.resources.appcontextExposeResponse;

    assert.ok(response, "No expose response captured — did you send a GET request first?");
    assert.equal(response.status, expectedStatus, `Expected status ${expectedStatus}, got ${response.status}`);
});

/**
 * Assert that the last exposed API response body contains a specific string.
 */
Then("response body contains {string}", async function (this: CustomWorld, expectedText: string) {
    const response = this.resources.appcontextExposeResponse;

    assert.ok(response, "No expose response captured — did you send a GET request first?");
    assert.ok(
        response.body.includes(expectedText),
        `Response body does not contain "${expectedText}". Body: ${response.body}`
    );
});

When("I upload the AppContext RPC fixture for runtime {string}", { timeout: 30000 }, async function (this: CustomWorld, runtime: string) {
    const isolation = this.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must be available to package the RPC fixture");
    const fixture = await createAppContextRpcFixture(isolation, runtime);
    const temporaryClient = this.resources.hostClient ? undefined : new HostClient(process.env.LOCAL_HOST_BASE_URL || "http://127.0.0.1:8000/api/v1");
    try {
        this.resources.sequence = await (this.resources.hostClient || temporaryClient!).sendSequence(createReadStream(fixture.archivePath));
    } finally {
        temporaryClient?.dispose();
    }
});

When("I send POST JSON to instance RPC endpoint {string}", { timeout: 10000 }, async function (this: CustomWorld, endpointPath: string) {
    const instance = this.resources.instance;
    assert.ok(instance, "No active instance");
    const info = await instance.getInfo();
    const apiBase = (process.env.LOCAL_HOST_BASE_URL || "http://127.0.0.1:8000/api/v1").replace(/\/+$/, "");
    const url = new URL(`${apiBase}/instance/${info.id}/rpc${endpointPath.startsWith("/") ? "" : "/"}${endpointPath}`);
    const payload = JSON.stringify({ a: 2, b: 3 });
    const response = await new Promise<{ status: number; contentType: string | undefined; body: string }>((resolve, reject) => {
        const req = http.request(url, { method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload) }, timeout: 5000 }, (res) => {
            let body = "";
            res.setEncoding("utf8");
            res.on("data", chunk => { body += chunk; });
            res.on("end", () => resolve({ status: res.statusCode ?? 0, contentType: res.headers["content-type"], body }));
            res.on("error", reject);
        });
        req.on("timeout", () => req.destroy(new Error(`Request to ${url} timed out`)));
        req.on("error", reject);
        req.end(payload);
    });
    this.resources.appcontextRpcResponse = response;
});

Then("AppContext RPC response is exactly successful JSON", function (this: CustomWorld) {
    const response = this.resources.appcontextRpcResponse;
    assert.ok(response, "No AppContext RPC response captured");
    assert.equal(response.status, 200);
    assert.equal(response.contentType, "application/json");
    assert.deepEqual(JSON.parse(response.body), { result: 5 });
});
