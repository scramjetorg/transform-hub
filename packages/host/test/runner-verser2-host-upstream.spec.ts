import test from "ava";
import { STHOutboundVerser2Config } from "@scramjet/types";
import { getRunnerVerser2HostUpstreamParams } from "../src/lib/runner-verser2-host-peers";

const baseVerser2Config: STHOutboundVerser2Config = {
    enabled: true,
    hostUrl: "https://manager.example.test:2443",
    runnerHost: {
        enabled: true,
        identityDir: "/tmp/sth-runner-host",
        host: {
            bindHost: "127.0.0.1",
            bindPort: 2444,
            publicUrl: "https://sth-local.example:2444",
            tls: { mtlsRequired: false }
        },
        registration: {
            allowedClientFingerprints: []
        },
        localBroker: { peerId: "sth.runner.broker" }
    },
    broker: {
        peerId: "sth.broker",
        targetDomain: "broker.local.scramjet.internal"
    },
    guest: {
        peerId: "sth.guest",
        routeDomain: "sth.local.scramjet.internal"
    },
    tls: {
        caFile: "/etc/verser/manager-ca.pem"
    },
    enrollment: {},
    timeouts: {
        routeReadinessMs: 5000,
        leaseAcquireMs: 3000,
        requestMs: 10000
    },
    leases: {
        minimumWaitingLeases: 0
    }
};

test("getRunnerVerser2HostUpstreamParams returns Manager upstream params when enabled", t => {
    const result = getRunnerVerser2HostUpstreamParams(baseVerser2Config, true);

    t.deepEqual(result, {
        upstreamId: "manager",
        url: "https://manager.example.test:2443",
        tls: { caFile: "/etc/verser/manager-ca.pem" }
    });
});

test("getRunnerVerser2HostUpstreamParams maps inline CA trust", t => {
    const result = getRunnerVerser2HostUpstreamParams({
        ...baseVerser2Config,
        tls: { ca: "-----BEGIN CERTIFICATE-----\nmanager-ca\n-----END CERTIFICATE-----" }
    }, true);

    t.deepEqual(result?.tls, { ca: "-----BEGIN CERTIFICATE-----\nmanager-ca\n-----END CERTIFICATE-----" });
});

test("getRunnerVerser2HostUpstreamParams maps PEM client identity", t => {
    const result = getRunnerVerser2HostUpstreamParams({
        ...baseVerser2Config,
        tls: {
            caFile: "/etc/verser/manager-ca.pem",
            certFile: "/etc/verser/sth-client.crt",
            keyFile: "/etc/verser/sth-client.key",
            passphrase: "secret"
        }
    }, true);

    t.deepEqual(result?.tls, {
        caFile: "/etc/verser/manager-ca.pem",
        certFile: "/etc/verser/sth-client.crt",
        keyFile: "/etc/verser/sth-client.key",
        passphrase: "secret"
    });
});

test("getRunnerVerser2HostUpstreamParams maps PFX client identity", t => {
    const result = getRunnerVerser2HostUpstreamParams({
        ...baseVerser2Config,
        tls: {
            caFile: "/etc/verser/manager-ca.pem",
            pfxFile: "/etc/verser/sth-client.pfx",
            passphrase: "secret"
        }
    }, true);

    t.deepEqual(result?.tls, {
        caFile: "/etc/verser/manager-ca.pem",
        pfxFile: "/etc/verser/sth-client.pfx",
        passphrase: "secret"
    });
});

test("getRunnerVerser2HostUpstreamParams returns null when runnerHost disabled", t => {
    const config = {
        ...baseVerser2Config,
        runnerHost: { ...baseVerser2Config.runnerHost!, enabled: false }
    };

    t.is(getRunnerVerser2HostUpstreamParams(config, true), null);
});

test("getRunnerVerser2HostUpstreamParams returns null when CPM is not configured", t => {
    t.is(getRunnerVerser2HostUpstreamParams(baseVerser2Config, false), null);
});

test("getRunnerVerser2HostUpstreamParams rejects partial PEM identity", t => {
    const config = {
        ...baseVerser2Config,
        tls: {
            caFile: "/etc/verser/manager-ca.pem",
            certFile: "/etc/verser/sth-client.crt"
        }
    };

    t.throws(
        () => getRunnerVerser2HostUpstreamParams(config, true),
        { message: "Both verser2 TLS certFile and keyFile must be provided together" }
    );
});
