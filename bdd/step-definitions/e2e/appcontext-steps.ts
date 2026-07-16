import { Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { CustomWorld } from "../world";
import http from "http";

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

    this.resources.appcontextExposeResponse = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = http.get(exposeUrl, { agent: false }, (res) => {
            let body = "";

            res.on("data", (chunk: Buffer) => { body += chunk.toString("utf8"); });
            res.on("end", () => {
                const response = { status: res.statusCode ?? 0, body };
                resolve(response);
            });
            res.on("error", reject);
        });

        req.on("error", reject);
        req.setTimeout(5000, () => {
            req.destroy(new Error(`Request to ${exposeUrl} timed out`));
        });
    });
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
