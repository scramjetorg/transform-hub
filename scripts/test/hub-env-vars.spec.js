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
