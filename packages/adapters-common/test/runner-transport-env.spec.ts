import test from "ava";
import { STHConfiguration } from "@scramjet/types";

import { buildRunnerTrustBundle, getRunnerTransportEnv } from "../src/get-runner-env";

const baseVerser2: STHConfiguration["verser2"] = {
    enabled: true,
    hostUrl: "https://verser2.example",
    broker: { peerId: "sth.broker", targetDomain: "manager.internal" },
    guest: { peerId: "sth.guest", routeDomain: "sth.internal" },
    tls: { caFile: "/ca.pem", certFile: "/cert.pem", keyFile: "/key.pem" },
    enrollment: {},
    timeouts: { routeReadinessMs: 1000, leaseAcquireMs: 2000, requestMs: 3000 },
    leases: { minimumWaitingLeases: 4 }
};

const sthLocalCa = "-----BEGIN CERTIFICATE-----\nsth-local\n-----END CERTIFICATE-----";
const managerCa = "-----BEGIN CERTIFICATE-----\nmanager\n-----END CERTIFICATE-----";

function withRunnerHost(verser2: STHConfiguration["verser2"] = baseVerser2): STHConfiguration["verser2"] {
    return {
        ...verser2,
        tls: { ...verser2.tls, ca: managerCa },
        runnerHost: {
            enabled: true,
            identityDir: "/tmp/sth-runner-host",
            ca: sthLocalCa,
            host: {
                bindHost: "127.0.0.1",
                bindPort: 2445,
                publicUrl: "https://sth-local.example:2445",
                tls: { mtlsRequired: false }
            },
            registration: {
                allowedClientFingerprints: []
            },
            localBroker: { peerId: "sth.runner.broker" }
        }
    };
}

test("getRunnerTransportEnv fails closed until STH-local Host exists", t => {
    t.throws(() => getRunnerTransportEnv({ verser2: { ...baseVerser2, enabled: false } }, "inst-1"), {
        message: /STH-local verser2 runner Host configuration is required/
    });
    t.throws(() => getRunnerTransportEnv({ verser2: baseVerser2 }, "inst-42"), {
        message: /STH-local verser2 runner Host configuration is required/
    });
});

test("getRunnerTransportEnv emits STH-local verser2 runner transport when trust is ready", t => {
    const env = getRunnerTransportEnv({ verser2: withRunnerHost() }, "inst-42");
    const parsed = JSON.parse(env.SCRAMJET_RUNNER_TRANSPORT_CONFIG);

    t.is(parsed.kind, "verser2");
    t.is(parsed.hostUrl, "https://sth-local.example:2445");
    t.not(parsed.hostUrl, baseVerser2.hostUrl);
    t.is(parsed.routeDomain, "runner.inst-42.scramjet.internal");
    t.is(parsed.guestId, "runner.inst-42.guest");
    t.is(parsed.hubBrokerId, "runner.inst-42.hub.broker");
    t.is(parsed.hubTargetDomain, "sth.internal");
    t.not(parsed.hubTargetDomain, baseVerser2.broker.targetDomain);
    t.is(parsed.leaseAcquireTimeoutMs, 2000);
    t.is(parsed.minWaitingStreams, 32);
    t.deepEqual(parsed.tls, { ca: `${sthLocalCa}\n${managerCa}` });
});

test("getRunnerTransportEnv preserves configured runner waiting stream floor when higher than transport minimum", t => {
    const env = getRunnerTransportEnv({
        verser2: withRunnerHost({
            ...baseVerser2,
            leases: { minimumWaitingLeases: 12, minimumRunnerWaitingStreams: 64 }
        })
    }, "inst-42");
    const parsed = JSON.parse(env.SCRAMJET_RUNNER_TRANSPORT_CONFIG);

    t.is(parsed.minWaitingStreams, 64);
});

test("getRunnerTransportEnv falls back to legacy lease minimum when runner-specific value is absent", t => {
    const env = getRunnerTransportEnv({
        verser2: withRunnerHost({
            ...baseVerser2,
            leases: { minimumWaitingLeases: 48 }
        })
    }, "inst-42");
    const parsed = JSON.parse(env.SCRAMJET_RUNNER_TRANSPORT_CONFIG);

    t.is(parsed.minWaitingStreams, 48);
});

test("getRunnerTransportEnv honors legacy lease minimum as a global floor", t => {
    const env = getRunnerTransportEnv({
        verser2: withRunnerHost({
            ...baseVerser2,
            leases: { minimumWaitingLeases: 96, minimumRunnerWaitingStreams: 32 }
        })
    }, "inst-42");
    const parsed = JSON.parse(env.SCRAMJET_RUNNER_TRANSPORT_CONFIG);

    t.is(parsed.minWaitingStreams, 96);
});

test("getRunnerTransportEnv fails closed without STH-local CA", t => {
    const verser2 = withRunnerHost();

    delete verser2.runnerHost!.ca;

    t.throws(() => getRunnerTransportEnv({ verser2 }, "inst-42"), {
        message: /STH-local verser2 runner Host configuration is required/
    });
});

test("getRunnerTransportEnv does not propagate STH TLS identity material to runners", t => {
    const env = getRunnerTransportEnv({ verser2: withRunnerHost() }, "inst-secret");
    const parsed = JSON.parse(env.SCRAMJET_RUNNER_TRANSPORT_CONFIG);

    t.false(JSON.stringify(parsed).includes("/cert.pem"));
    t.false(JSON.stringify(parsed).includes("/key.pem"));
    t.false(JSON.stringify(parsed).includes("PRIVATE KEY"));
});

test("buildRunnerTrustBundle returns undefined until STH-local CA is available", t => {
    t.is(buildRunnerTrustBundle({ verser2: baseVerser2 }), undefined);
});

test("buildRunnerTrustBundle includes STH-local CA first and Manager CA second", t => {
    const bundle = buildRunnerTrustBundle({
        verser2: {
            ...baseVerser2,
            tls: { ...baseVerser2.tls, ca: `\n${managerCa}\n` },
            runnerHost: {
                enabled: true,
                identityDir: "/tmp/sth-runner-host",
                ca: `\n${sthLocalCa}\n`,
                host: {
                    bindHost: "127.0.0.1",
                    bindPort: 2445,
                    publicUrl: "https://127.0.0.1:2445",
                    tls: { mtlsRequired: false }
                },
                registration: {
                    allowedClientFingerprints: []
                },
                localBroker: { peerId: "sth.runner.broker" }
            }
        }
    });

    t.is(bundle, `${sthLocalCa}\n${managerCa}`);
});

test("buildRunnerTrustBundle never includes private key or passphrase fields", t => {
    const bundle = buildRunnerTrustBundle({
        verser2: {
            ...baseVerser2,
            tls: { ...baseVerser2.tls, ca: managerCa, passphrase: "manager-passphrase" },
            runnerHost: {
                enabled: true,
                identityDir: "/tmp/sth-runner-host",
                ca: sthLocalCa,
                host: {
                    bindHost: "127.0.0.1",
                    bindPort: 2445,
                    publicUrl: "https://127.0.0.1:2445",
                    tls: {
                        mtlsRequired: false,
                        keyFile: "/secret/server-key.pem",
                        passphrase: "server-passphrase"
                    }
                },
                registration: {
                    token: "runner-token",
                    allowedClientFingerprints: []
                },
                localBroker: { peerId: "sth.runner.broker" }
            }
        }
    });

    t.false(bundle!.includes("PRIVATE KEY"));
    t.false(bundle!.includes("passphrase"));
    t.false(bundle!.includes("runner-token"));
    t.false(bundle!.includes("server-key"));
});
