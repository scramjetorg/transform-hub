"use strict";

const test = require("ava").default;
const path = require("node:path");
const { PassThrough } = require("node:stream");
require("ts-node").register({ project: path.resolve(__dirname, "../../bdd/tsconfig.json") });
const { HostUtils } = require("../../bdd/lib/host-utils");

test("HostUtils child disposal destroys stdio and removes listeners", async t => {
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    stdout.on("data", () => undefined);
    stderr.on("data", () => undefined);
    const child = { stdout, stderr, removeAllListeners: () => undefined };

    await HostUtils.disposeChildIO(child);

    t.true(stdout.destroyed);
    t.true(stderr.destroyed);
    t.is(stdout.listenerCount("data"), 0);
    t.is(stderr.listenerCount("data"), 0);
});
