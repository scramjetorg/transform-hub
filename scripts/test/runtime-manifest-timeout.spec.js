"use strict";

const test = require("ava").default;
require("tsx/cjs");
const { formatRuntimeManifestTimeout } = require("../../bdd/lib/runtime-manifest-timeout.ts");

test("formats pending operation timing, assigned identities, event, limit, and cleanup state", t => {
    const report = formatRuntimeManifestTimeout({
        checkpoint: "python.consumer.observed-event",
        startedAt: 1000,
        eventName: "runtime-manifest-observed",
        instanceId: "instance-assigned-1",
        sequenceId: "sequence-assigned-1"
    }, { nowMs: 19200, stepLimitMs: 20000, cleanupBegun: false });

    t.deepEqual(report, {
        message: "BDD step timed out (20000 ms limit).\nWaiting: python.consumer.observed-event — event runtime-manifest-observed\nPending operation elapsed: 18.2 s\nInstance: instance-assigned-1; Sequence: sequence-assigned-1\nCleanup begun: no",
        attachment: {
            checkpoint: "python.consumer.observed-event",
            eventName: "runtime-manifest-observed",
            elapsedOperationMs: 18200,
            instanceId: "instance-assigned-1",
            sequenceId: "sequence-assigned-1",
            cleanupBegun: false,
            stepLimitMs: 20000
        }
    });
});

test("returns undefined when there is no actual pending checkpoint", t => {
    t.is(formatRuntimeManifestTimeout(undefined), undefined);
    t.is(formatRuntimeManifestTimeout(null), undefined);
    t.is(formatRuntimeManifestTimeout({ startedAt: 100 }), undefined);
    t.is(formatRuntimeManifestTimeout({ checkpoint: "" }), undefined);
});

test("does not invent unavailable timing, event, or identity values", t => {
    const report = formatRuntimeManifestTimeout({ checkpoint: "node.upload", startedAt: "unknown" }, { nowMs: 1000, cleanupBegun: true });

    t.deepEqual(report, {
        message: "BDD step timed out.\nWaiting: node.upload\nCleanup begun: yes",
        attachment: { checkpoint: "node.upload", cleanupBegun: true }
    });
});

test("sanitizes the message and attachment to approved checkpoint fields only", t => {
    const sentinels = ["RESPONSE_SENTINEL", "CONFIG_SENTINEL", "ENV_SENTINEL", "TLS_SENTINEL", "CREDENTIAL_SENTINEL"];
    const report = formatRuntimeManifestTimeout({
        checkpoint: "audit.string.published",
        startedAt: 400,
        instanceId: "instance-safe",
        sequenceId: "sequence-safe",
        response: sentinels[0],
        config: sentinels[1],
        environment: sentinels[2],
        tls: sentinels[3],
        credential: sentinels[4]
    }, { nowMs: 900, stepLimitMs: 20000 });

    const output = `${report.message}\n${JSON.stringify(report.attachment)}`;
    for (const sentinel of sentinels) t.false(output.includes(sentinel));
    t.deepEqual(Object.keys(report.attachment).sort(), ["checkpoint", "cleanupBegun", "elapsedOperationMs", "instanceId", "sequenceId", "stepLimitMs"].sort());
});
