"use strict";

const test = require("ava").default;
const http = require("node:http");
const { spawnSync } = require("node:child_process");
const { existsSync, realpathSync } = require("node:fs");
require("tsx/cjs");
const { ScenarioLifecycle } = require("../../scripts/lib/bdd-scenario-lifecycle.js");
const { memoryRegistry } = require("../../bdd/lib/memory-registry.ts");
const { createScenarioIsolation } = require("../../bdd/lib/scenario-isolation.ts");
const { closeManifestHost, readManifestHostConfig, startManifestHost } = require("../../bdd/lib/runtime-manifest-host.ts");

function getVersion(url) {
    return new Promise((resolve, reject) => {
        const request = http.get(`${url}/version`, response => {
            let body = "";
            response.setEncoding("utf8");
            response.on("data", chunk => { body += chunk; });
            response.once("end", () => resolve({ status: response.statusCode, body: JSON.parse(body) }));
        });
        request.once("error", reject);
    });
}

test("starts and closes an isolated source Host with its selected config", async t => {
    const lifecycle = new ScenarioLifecycle(memoryRegistry);
    const isolation = createScenarioIsolation(lifecycle);
    const world = { scenarioLifecycle: lifecycle, scenarioIsolation: isolation, resources: {} };
    try {
        const state = await startManifestHost(world, "source");
        t.is(world.resources.runtimeManifestHost, state);
        t.is(state.child, state.hostUtils.host);
        t.deepEqual(state.child.spawnargs.slice(0, state.artifacts.hostCommand.length + 1), ["/usr/bin/env", ...state.artifacts.hostCommand]);
        t.is(realpathSync(`/proc/${state.child.pid}/cwd`), realpathSync(state.artifacts.workspaceRoot));
        t.true(existsSync(`${state.artifacts.workspaceRoot}/dist/api-router`), "source resolution regression requires the competing built artifact to exist");
        const childEnvironment = { ...process.env };
        delete childEnvironment.TSX_TSCONFIG_PATH;
        const resolution = spawnSync(process.execPath, ["--require", require.resolve("tsx/cjs"), "-e", "process.stdout.write(require.resolve('@scramjet/api-router'))"], {
            cwd: state.artifacts.workspaceRoot,
            env: childEnvironment,
            encoding: "utf8"
        });
        t.is(resolution.status, 0, `source api-router resolution failed: ${resolution.stderr}`);
        t.is(realpathSync(resolution.stdout), realpathSync(`${state.artifacts.workspaceRoot}/packages/api-router/src/index.ts`));
        const config = readManifestHostConfig(state);
        t.is(config.runtimeAdapter, "process");
        t.is(config.host.port, Number(new URL(state.apiBaseUrl).port));
        t.is(config.killOnExit, true);
        t.is(config.exitWithLastInstance, false);
        t.is(config.verser2.runnerHost.host.publicUrl, `https://127.0.0.1:${config.verser2.runnerHost.host.bindPort}`);
        const response = await getVersion(state.apiBaseUrl);
        t.is(response.status, 200);
        t.truthy(response.body.version);
        await closeManifestHost(world);
        t.is(world.resources.runtimeManifestHost, undefined);
        t.true(state.hostUtils.hostProcessStopped);
    } finally {
        await closeManifestHost(world);
        await isolation.cleanup();
    }
}, { timeout: 90000 });
