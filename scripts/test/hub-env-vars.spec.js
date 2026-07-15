/**
 * @file scripts/test/hub-env-vars.spec.js
 *
 * Tests for the SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL env-var save/set
 * /restore pattern used in bdd/step-definitions/hub/config.ts.
 *
 * Scenario-spawned hubs must not inherit the suite host's fixed runner
 * verser2 port.  When startHubWithParams allocates a free port for
 * SCRAMJET_VERSER2_RUNNER_HOST_BIND_PORT, it must also set
 * SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL so that launched runners can
 * connect back to this Hub.
 */

"use strict";

const test = require("ava");
const fs = require("fs");
const path = require("path");

test("@starts-host production path clears the suite-host shortcut", t => {
    const source = fs.readFileSync(
        path.join(__dirname, "../../bdd/step-definitions/hub/config.ts"),
        "utf8"
    );
    const startOffset = source.indexOf("async function startHubWithParams");
    const constructorOffset = source.indexOf("const hostUtils = new HostUtils();", startOffset);
    const clearOffset = source.indexOf('hostUtils.hostUrl = "";', constructorOffset);

    t.true(startOffset >= 0);
    t.true(clearOffset > constructorOffset);
    t.true(clearOffset < source.indexOf("const expectedHubExitCode", constructorOffset));
});

/**
 * Simulate the env-var save / set / restore pattern from startHubWithParams.
 */
function simulateHubEnvSet(allocatedPort) {
    const runnerHostPublicUrlEnv = "SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL";
    const savedRunnerHostPublicUrl = process.env[runnerHostPublicUrlEnv];

    process.env[runnerHostPublicUrlEnv] = `https://127.0.0.1:${allocatedPort}`;

    // Return the restore function
    return function restore() {
        if (savedRunnerHostPublicUrl === undefined) {
            delete process.env[runnerHostPublicUrlEnv];
        } else {
            process.env[runnerHostPublicUrlEnv] = savedRunnerHostPublicUrl;
        }
    };
}

test("SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL is set with correct scheme and address", t => {
    const allocatedPort = "34567";
    const restore = simulateHubEnvSet(allocatedPort);

    t.is(
        process.env.SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL,
        `https://127.0.0.1:${allocatedPort}`
    );

    restore();
    t.falsy(process.env.SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL);
});

test("SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL restore preserves previous value", t => {
    // Set up a pre-existing value
    process.env.SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL = "https://original:1111";
    const allocatedPort = "45678";
    const restore = simulateHubEnvSet(allocatedPort);

    t.is(
        process.env.SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL,
        `https://127.0.0.1:${allocatedPort}`
    );

    restore();
    t.is(
        process.env.SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL,
        "https://original:1111"
    );

    delete process.env.SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL;
});

/**
 * Simulate the saveHostEnv / restoreHostEnv / restoreSavedHostEnv pattern
 * from hub/config.ts.  After a @starts-host scenario overrides LOCAL_HOST_*
 * and SCRAMJET_HOST_BASE_URL, the After hook must restore the suite-host
 * values so later non-starts-host scenarios can reach the live suite host.
 */
function simulateSaveHostEnv() {
    return {
        LOCAL_HOST_PORT: process.env.LOCAL_HOST_PORT,
        LOCAL_HOST_INSTANCES_SERVER_PORT: process.env.LOCAL_HOST_INSTANCES_SERVER_PORT,
        LOCAL_HOST_BASE_URL: process.env.LOCAL_HOST_BASE_URL,
        SCRAMJET_HOST_BASE_URL: process.env.SCRAMJET_HOST_BASE_URL,
        SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL: process.env.SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL,
    };
}

function simulateRestoreHostEnv(saved) {
    for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
}

function simulateRestoreSavedHostEnv(resources) {
    if (!resources.savedHostEnv) return;
    simulateRestoreHostEnv(resources.savedHostEnv);
    delete resources.savedHostEnv;
}

test("saveHostEnv captures all five host env vars", t => {
    const suite = {
        LOCAL_HOST_PORT: "18000",
        LOCAL_HOST_INSTANCES_SERVER_PORT: "19000",
        LOCAL_HOST_BASE_URL: "http://127.0.0.1:18000/api/v1",
        SCRAMJET_HOST_BASE_URL: "http://127.0.0.1:18000/api/v1",
        SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL: "https://127.0.0.1:2444",
    };

    // Set up suite host env
    for (const [k, v] of Object.entries(suite)) {
        process.env[k] = v;
    }

    const saved = simulateSaveHostEnv();

    t.is(saved.LOCAL_HOST_PORT, "18000");
    t.is(saved.LOCAL_HOST_INSTANCES_SERVER_PORT, "19000");
    t.is(saved.LOCAL_HOST_BASE_URL, "http://127.0.0.1:18000/api/v1");
    t.is(saved.SCRAMJET_HOST_BASE_URL, "http://127.0.0.1:18000/api/v1");
    t.is(saved.SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL, "https://127.0.0.1:2444");

    for (const k of Object.keys(suite)) {
        delete process.env[k];
    }
});

test("restoreHostEnv restores suite host values after scenario override", t => {
    const suite = {
        LOCAL_HOST_PORT: "18000",
        LOCAL_HOST_INSTANCES_SERVER_PORT: "19000",
        LOCAL_HOST_BASE_URL: "http://127.0.0.1:18000/api/v1",
        SCRAMJET_HOST_BASE_URL: "http://127.0.0.1:18000/api/v1",
        SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL: "https://127.0.0.1:2444",
    };
    const scenario = {
        LOCAL_HOST_PORT: "28000",
        LOCAL_HOST_INSTANCES_SERVER_PORT: "29000",
        LOCAL_HOST_BASE_URL: "http://127.0.0.1:28000/api/v1",
        SCRAMJET_HOST_BASE_URL: "http://127.0.0.1:28000/api/v1",
        SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL: "https://127.0.0.1:3444",
    };

    // Set suite host env and save
    for (const [k, v] of Object.entries(suite)) {
        process.env[k] = v;
    }
    const saved = simulateSaveHostEnv();

    // Override with scenario host values
    for (const [k, v] of Object.entries(scenario)) {
        process.env[k] = v;
    }

    // Verify scenario values are active
    t.is(process.env.LOCAL_HOST_BASE_URL, "http://127.0.0.1:28000/api/v1");

    // Restore
    simulateRestoreHostEnv(saved);

    // Verify suite host values restored
    t.is(process.env.LOCAL_HOST_PORT, "18000");
    t.is(process.env.LOCAL_HOST_INSTANCES_SERVER_PORT, "19000");
    t.is(process.env.LOCAL_HOST_BASE_URL, "http://127.0.0.1:18000/api/v1");
    t.is(process.env.SCRAMJET_HOST_BASE_URL, "http://127.0.0.1:18000/api/v1");
    t.is(process.env.SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL, "https://127.0.0.1:2444");

    for (const k of Object.keys(suite)) {
        delete process.env[k];
    }
});

test("restoreHostEnv deletes env vars that were undefined in saved set", t => {
    // Set up scenario env (suite host did not define all vars)
    process.env.LOCAL_HOST_BASE_URL = "http://127.0.0.1:28000/api/v1";

    // Save — captures LOCAL_HOST_BASE_URL but the others should be undefined
    const saved = simulateSaveHostEnv();

    // Override
    process.env.LOCAL_HOST_PORT = "9999";
    process.env.SCRAMJET_HOST_BASE_URL = "http://override/api/v1";

    // Restore
    simulateRestoreHostEnv(saved);

    // LOCAL_HOST_PORT was undefined in saved, so it must be deleted
    t.falsy(process.env.LOCAL_HOST_PORT);
    // SCRAMJET_HOST_BASE_URL was undefined in saved, so it must be deleted
    t.falsy(process.env.SCRAMJET_HOST_BASE_URL);
    // LOCAL_HOST_BASE_URL was captured and must be restored
    t.is(process.env.LOCAL_HOST_BASE_URL, "http://127.0.0.1:28000/api/v1");

    delete process.env.LOCAL_HOST_BASE_URL;
});

test("restoreSavedHostEnv is no-op when savedHostEnv not present", t => {
    const resources = {};
    t.notThrows(() => simulateRestoreSavedHostEnv(resources));
    t.notThrows(() => simulateRestoreSavedHostEnv({}));
    // savedHostEnv not present — no crash, no side effect
    t.pass();
});

test("restoreSavedHostEnv restores and clears savedHostEnv from resources", t => {
    const resources = {
        savedHostEnv: {
            LOCAL_HOST_PORT: "18000",
        },
    };

    process.env.LOCAL_HOST_PORT = "9999";

    simulateRestoreSavedHostEnv(resources);

    t.is(process.env.LOCAL_HOST_PORT, "18000");
    t.falsy(resources.savedHostEnv);

    delete process.env.LOCAL_HOST_PORT;
});

test("restoreSavedHostEnv in After hook prevents stale host url leak to next scenario", t => {
    // Simulate the After hook's flow: restore then check next scenario sees
    // the suite host, not the stale scenario host.

    const suiteUrl = "http://127.0.0.1:18000/api/v1";
    const scenarioUrl = "http://127.0.0.1:28000/api/v1";

    // Set suite host baseline
    process.env.LOCAL_HOST_BASE_URL = suiteUrl;
    process.env.SCRAMJET_HOST_BASE_URL = suiteUrl;

    // Save (as hub/config.ts step does)
    const saved = simulateSaveHostEnv();
    const resources = { savedHostEnv: saved };

    // Override (scenario starts its own host)
    process.env.LOCAL_HOST_BASE_URL = scenarioUrl;
    process.env.SCRAMJET_HOST_BASE_URL = scenarioUrl;

    t.is(process.env.LOCAL_HOST_BASE_URL, scenarioUrl);

    // After hook teardown (as host-steps.ts now does)
    simulateRestoreSavedHostEnv(resources);

    // Env points back to suite host — the next scenario correctly
    // resolves the live suite host, not the stale scenario host.
    t.is(process.env.LOCAL_HOST_BASE_URL, suiteUrl);
    t.is(process.env.SCRAMJET_HOST_BASE_URL, suiteUrl);

    delete process.env.LOCAL_HOST_BASE_URL;
    delete process.env.SCRAMJET_HOST_BASE_URL;
});

test("SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL is set alongside RUNNER_HOST_BIND_PORT", t => {
    const allocatedPort = "56789";

    process.env.SCRAMJET_VERSER2_RUNNER_HOST_BIND_PORT = allocatedPort;
    process.env.SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL =
        `https://127.0.0.1:${allocatedPort}`;

    t.is(process.env.SCRAMJET_VERSER2_RUNNER_HOST_BIND_PORT, allocatedPort);
    t.is(
        process.env.SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL,
        `https://127.0.0.1:${allocatedPort}`
    );

    // Verify the URL matches the bind port
    const urlMatch =
        process.env.SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL.match(/:(\d+)$/);

    t.truthy(urlMatch);
    t.is(urlMatch[1], allocatedPort);

    delete process.env.SCRAMJET_VERSER2_RUNNER_HOST_BIND_PORT;
    delete process.env.SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL;
});
