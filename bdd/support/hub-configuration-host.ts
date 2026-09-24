import { Given, When, Then, After } from "@cucumber/cucumber";
import { HostClient } from "@scramjet/api-client";
import { strict as assert } from "assert";
import { writeFile, unlink } from "fs/promises";
import { promisify } from "util";
import { HostUtils } from "../lib/host-utils";
import { retryLoadCheck } from "../lib/utils";
import { CustomWorld } from "../step-definitions/world";

const freeport = promisify(require("freeport"));
const { expectedHostVersion } = require("../lib/release-prerelease-context.js");
const { version } = require("../../package.json");

Given("host is running", async function(this: CustomWorld) {
    if (this.resources.hostClient) {
        try {
            await retryLoadCheck(
                (signal) => this.resources.hostClient!.getLoadCheck({ signal }),
                "Host did not become ready"
            );
            return;
        } catch {
            this.resources.hostClient.dispose();
            delete this.resources.hostClient;
        }
    }

    const apiPort = await freeport();
    const instancesServerPort = await freeport();
    const controlIngressPort = await freeport();
    const configPath = `data/.hub-verser2-${process.pid}-${Date.now()}.json`;
    const host = new HostUtils();
    host.hostUrl = "";

    await writeFile(configPath, JSON.stringify({
        verser2: {
            controlIngress: {
                host: {
                    bindPort: controlIngressPort,
                    publicUrl: `https://127.0.0.1:${controlIngressPort}`
                }
            }
        }
    }));

    try {
        await host.spawnHost(["port", "instances-server-port"], "-P", String(apiPort), "--instances-server-port", String(instancesServerPort), "--config", configPath);
    } finally {
        await unlink(configPath).catch(() => undefined);
    }

    assert.ok(host.host, "Hub process was not started");
    this.resources.hub = host.host;
    this.resources.hostClient = new HostClient(`http://127.0.0.1:${apiPort}/api/v1`);
    this.scenarioLifecycle.ownChild(host.host, "hub", { group: true, onStop: () => host.markStopExpected() });
    await retryLoadCheck(
        (signal) => this.resources.hostClient!.getLoadCheck({ signal }),
        "Host did not become ready"
    );
});

When("I get version", async function(this: CustomWorld) {
    this.resources.hubConfigurationResponse = await this.resources.hostClient!.getVersion();
});

Then("it returns the root package version", function(this: CustomWorld) {
    const response = { ...this.resources.hubConfigurationResponse };

    delete response.build;
    assert.deepStrictEqual(response, expectedHostVersion(version));
});

When("I get load-check", async function(this: CustomWorld) {
    this.resources.hubConfigurationResponse = await this.resources.hostClient!.getLoadCheck();
});

Then("it returns a correct load check with required properties", function(this: CustomWorld) {
    const data = this.resources.hubConfigurationResponse;

    assert.strictEqual(typeof data, "object");
    assert.strictEqual(typeof data.avgLoad, "number");
    assert.strictEqual(typeof data.currentLoad, "number");
    assert.strictEqual(typeof data.memFree, "number");
    assert.strictEqual(typeof data.memUsed, "number");
    assert.ok(Array.isArray(data.fsSize) && data.fsSize.length > 0);
    assert.strictEqual(typeof data.fsSize[0].fs, "string");
    assert.strictEqual(typeof data.fsSize[0].size, "number");
    assert.strictEqual(typeof data.fsSize[0].used, "number");
    assert.strictEqual(typeof data.fsSize[0].available, "number");
});

After(function(this: CustomWorld) {
    this.resources.hostClient?.dispose();
    delete this.resources.hostClient;
    delete this.resources.hubConfigurationResponse;
});
