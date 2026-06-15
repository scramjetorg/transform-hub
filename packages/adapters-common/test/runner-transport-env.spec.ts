import test from "ava";
import { STHConfiguration } from "@scramjet/types";

import { getRunnerTransportEnv } from "../src/get-runner-env";

const baseVerser2: STHConfiguration["verser2"] = {
    enabled: true,
    migrationMode: "verser2" as const,
    hostUrl: "https://verser2.example",
    broker: { peerId: "sth.broker", targetDomain: "manager.internal" },
    guest: { peerId: "sth.guest", routeDomain: "sth.internal" },
    tls: { caFile: "/ca.pem", certFile: "/cert.pem", keyFile: "/key.pem" },
    enrollment: {},
    timeouts: { routeReadinessMs: 1000, leaseAcquireMs: 2000, requestMs: 3000 },
    leases: { minimumWaitingLeases: 4 }
};

test("getRunnerTransportEnv injects explicit legacy config outside verser2-only mode", t => {
    const legacyEnv = { SCRAMJET_RUNNER_TRANSPORT_CONFIG: JSON.stringify({ kind: "legacy" }) };

    t.deepEqual(getRunnerTransportEnv({ verser2: { ...baseVerser2, enabled: false } }, "inst-1"), legacyEnv);
    t.deepEqual(getRunnerTransportEnv({ verser2: { ...baseVerser2, migrationMode: "dual" } }, "inst-1"), legacyEnv);
    t.deepEqual(getRunnerTransportEnv({ verser2: { ...baseVerser2, migrationMode: "legacy" } }, "inst-1"), legacyEnv);
});

test("getRunnerTransportEnv quarantines verser2 runner transport until STH-local Host exists", t => {
    const env = getRunnerTransportEnv({ verser2: baseVerser2 }, "inst-42");
    const parsed = JSON.parse(env.SCRAMJET_RUNNER_TRANSPORT_CONFIG);

    t.deepEqual(parsed, { kind: "legacy" });
    t.false("hostUrl" in parsed);
});

test("getRunnerTransportEnv does not propagate STH TLS identity material to runners", t => {
    const env = getRunnerTransportEnv({ verser2: baseVerser2 }, "inst-secret");
    const parsed = JSON.parse(env.SCRAMJET_RUNNER_TRANSPORT_CONFIG);

    t.is(parsed.tls, undefined);
});
