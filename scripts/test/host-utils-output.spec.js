"use strict";

const test = require("ava");
const path = require("path");
const tsNode = require("ts-node");

tsNode.register({ project: path.resolve(__dirname, "../../bdd/tsconfig.json") });

const { HostUtils } = require("../../bdd/lib/host-utils");

test("captures only the exact structured flood marker", async t => {
    const hostUtils = new HostUtils();
    const waiter = hostUtils.createStructuredOutputWaiter("abort-close", "/stdin", "flood-1");
    hostUtils.captureOutput('SCRAMJET_FLOOD_INGRESS_ACK {"event":"abort-close","url":"/other","id":"flood-1"}\n');
    hostUtils.captureOutput('SCRAMJET_FLOOD_INGRESS_ACK {"event":"abort-close","url":"/stdin","id":"flood-2"}\n');
    hostUtils.captureOutput('SCRAMJET_FLOOD_INGRESS_ACK {"event":"abort-close","url":"/stdin","id":"flood-1"}\n');
    await t.notThrowsAsync(waiter.promise);
});

test("output waiter rejects on absent marker and can be cancelled", async t => {
    const hostUtils = new HostUtils();
    const timeout = hostUtils.waitForStructuredOutput("abort-close", "/stdin", "flood-1", 25);
    hostUtils.captureOutput('SCRAMJET_FLOOD_INGRESS_ACK {"event":"abort-close","url":"/stdin","id":"flood-2"}\n');
    await t.throwsAsync(timeout, { message: /Timed out waiting for Hub marker/ });
    const waiter = hostUtils.createOutputWaiter(["never"]);
    waiter.cancel();
    await t.notThrowsAsync(waiter.promise);
});

test("flood acknowledgement requires a locally owned Hub child", t => {
    const oldNoHost = process.env.NO_HOST;
    const oldBaseUrl = process.env.SCRAMJET_HOST_BASE_URL;
    const hostUtils = new HostUtils();
    hostUtils.host = {};
    process.env.NO_HOST = "true";
    t.false(hostUtils.hasLocallyOwnedHubChild());
    delete process.env.NO_HOST;
    process.env.SCRAMJET_HOST_BASE_URL = "http://external.example";
    const external = new HostUtils();
    external.host = {};
    t.false(external.hasLocallyOwnedHubChild());
    if (oldNoHost === undefined) delete process.env.NO_HOST; else process.env.NO_HOST = oldNoHost;
    if (oldBaseUrl === undefined) delete process.env.SCRAMJET_HOST_BASE_URL; else process.env.SCRAMJET_HOST_BASE_URL = oldBaseUrl;
});
