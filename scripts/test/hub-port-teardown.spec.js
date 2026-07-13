/**
 * @file scripts/test/hub-port-teardown.spec.js
 *
 * Tests for the scenario-scoped occupied-port teardown pattern in
 * bdd/step-definitions/hub/config.ts.
 *
 * The After hook there must close any server that was opened by
 * "When port {int} is occupied" but not yet released by
 * "When the occupied port is released", preventing port leaks
 * when a scenario fails mid-way.
 */

"use strict";

const test = require("ava");
const net = require("net");

/**
 * Simulate the After hook logic from hub/config.ts.
 *
 * @param {object} worldResources  this.resources from CustomWorld
 * @param {net.Server[]} occupiedServers  shared occupiedServers array
 */
async function afterHook(worldResources, occupiedServers) {
    const server = worldResources.portOccupier;
    const occupiedByUs = worldResources.portOccupiedByUs;

    if (server && occupiedByUs) {
        const idx = occupiedServers.indexOf(server);

        if (idx >= 0) occupiedServers.splice(idx, 1);
        await new Promise(resolve => server.close(() => resolve()));
    }

    delete worldResources.portOccupier;
    delete worldResources.portOccupiedByUs;
}

test.serial("After hook closes owned server and removes from occupiedServers", async t => {
    const occupiedServers = [];
    const resources = {};
    const server = net.createServer();

    // Listen on a free port
    const port = await new Promise(resolve => {
        const s = net.createServer();

        s.listen(0, "127.0.0.1", () => {
            const p = s.address().port;

            s.close(() => resolve(p));
        });
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
            occupiedServers.push(server);
            resources.portOccupier = server;
            resources.portOccupiedByUs = true;
            resolve();
        });
    });

    t.true(server.listening);
    t.is(occupiedServers.length, 1);
    t.is(resources.portOccupier, server);
    t.true(resources.portOccupiedByUs);

    // Run the After hook
    await afterHook(resources, occupiedServers);

    t.false(server.listening);
    t.is(occupiedServers.length, 0);
    t.is(resources.portOccupier, undefined);
    t.is(resources.portOccupiedByUs, undefined);
});

test.serial("After hook skips when portOccupiedByUs is false", async t => {
    const occupiedServers = [];
    const resources = { portOccupier: undefined, portOccupiedByUs: false };

    // Should not throw — this is the case when the port was already occupied
    // by the suite host (EADDRINUSE path).
    await afterHook(resources, occupiedServers);

    t.is(resources.portOccupier, undefined);
    t.is(resources.portOccupiedByUs, undefined);
});

test.serial("After hook skips when there is no server", async t => {
    const occupiedServers = [];
    const resources = {};

    await afterHook(resources, occupiedServers);

    t.is(resources.portOccupier, undefined);
    t.is(resources.portOccupiedByUs, undefined);
});

test.serial("After hook handles server already removed from occupiedServers", async t => {
    const occupiedServers = [];
    const resources = {};
    const server = net.createServer();

    const port = await new Promise(resolve => {
        const s = net.createServer();

        s.listen(0, "127.0.0.1", () => {
            const p = s.address().port;

            s.close(() => resolve(p));
        });
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
            resources.portOccupier = server;
            resources.portOccupiedByUs = true;
            resolve();
        });
    });

    // Server is NOT in occupiedServers — e.g. it was released but not closed
    await afterHook(resources, occupiedServers);

    t.false(server.listening);
    t.is(resources.portOccupier, undefined);
    t.is(resources.portOccupiedByUs, undefined);
});
