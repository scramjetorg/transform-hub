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
            allowLocalPeers: true,
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

test("getRunnerVerser2HostUpstreamParams returns params when runnerHost enabled and CPM configured", t => {
    const result = getRunnerVerser2HostUpstreamParams(baseVerser2Config, true);

    t.not(result, null);
    t.is(result!.upstreamId, "manager");
    t.is(result!.url, "https://manager.example.test:2443");
});

test("getRunnerVerser2HostUpstreamParams maps TLS trust from verser2.tls.caFile", t => {
    const result = getRunnerVerser2HostUpstreamParams(baseVerser2Config, true);

    t.not(result, null);
    t.deepEqual(result!.tls, { caFile: "/etc/verser/manager-ca.pem" });
});

test("getRunnerVerser2HostUpstreamParams maps TLS identity with PEM cert and key", t => {
    const config: STHOutboundVerser2Config = {
        ...baseVerser2Config,
        tls: {
            caFile: "/etc/verser/manager-ca.pem",
            certFile: "/etc/verser/sth-client.crt",
            keyFile: "/etc/verser/sth-client.key",
            passphrase: "secret"
        }
    };

    const result = getRunnerVerser2HostUpstreamParams(config, true);

    t.not(result, null);
    t.is(result!.tls.caFile, "/etc/verser/manager-ca.pem");
    t.is((result!.tls as any).certFile, "/etc/verser/sth-client.crt");
    t.is((result!.tls as any).keyFile, "/etc/verser/sth-client.key");
    t.is((result!.tls as any).passphrase, "secret");
});

test("getRunnerVerser2HostUpstreamParams maps TLS identity with PFX", t => {
    const config: STHOutboundVerser2Config = {
        ...baseVerser2Config,
        tls: {
            caFile: "/etc/verser/manager-ca.pem",
            pfxFile: "/etc/verser/sth-client.pfx",
            passphrase: "pfx-secret"
        }
    };

    const result = getRunnerVerser2HostUpstreamParams(config, true);

    t.not(result, null);
    t.is(result!.tls.caFile, "/etc/verser/manager-ca.pem");
    t.is((result!.tls as any).pfxFile, "/etc/verser/sth-client.pfx");
    t.is((result!.tls as any).passphrase, "pfx-secret");
});

test("getRunnerVerser2HostUpstreamParams maps TLS trust from inline ca as fallback", t => {
    const config: STHOutboundVerser2Config = {
        ...baseVerser2Config,
        tls: {
            ca: "-----BEGIN CERTIFICATE-----\nmanager-ca\n-----END CERTIFICATE-----"
        }
    };

    const result = getRunnerVerser2HostUpstreamParams(config, true);

    t.not(result, null);
    t.is(result!.tls.ca, "-----BEGIN CERTIFICATE-----\nmanager-ca\n-----END CERTIFICATE-----");
    t.is((result!.tls as any).caFile, undefined);
});

test("getRunnerVerser2HostUpstreamParams returns null when runnerHost is disabled", t => {
    const config: STHOutboundVerser2Config = {
        ...baseVerser2Config,
        runnerHost: { ...baseVerser2Config.runnerHost!, enabled: false }
    };

    t.is(getRunnerVerser2HostUpstreamParams(config, true), null);
});

test("getRunnerVerser2HostUpstreamParams returns null when runnerHost is undefined", t => {
    const config: STHOutboundVerser2Config = {
        ...baseVerser2Config,
        runnerHost: undefined
    };

    t.is(getRunnerVerser2HostUpstreamParams(config, true), null);
});

test("getRunnerVerser2HostUpstreamParams returns null when CPM is not configured", t => {
    t.is(getRunnerVerser2HostUpstreamParams(baseVerser2Config, false), null);
});

test("getRunnerVerser2HostUpstreamParams returns null when runnerHost disabled and CPM not configured", t => {
    const config: STHOutboundVerser2Config = {
        ...baseVerser2Config,
        runnerHost: { ...baseVerser2Config.runnerHost!, enabled: false }
    };

    t.is(getRunnerVerser2HostUpstreamParams(config, false), null);
});

test("getRunnerVerser2HostUpstreamParams upstreamId is always 'manager'", t => {
    const result = getRunnerVerser2HostUpstreamParams(baseVerser2Config, true);

    t.not(result, null);
    t.is(result!.upstreamId, "manager");
});

test("getRunnerVerser2HostUpstreamParams url matches verser2.hostUrl exactly", t => {
    const config: STHOutboundVerser2Config = {
        ...baseVerser2Config,
        hostUrl: "https://multimanager.example.test:8443"
    };

    const result = getRunnerVerser2HostUpstreamParams(config, true);

    t.not(result, null);
    t.is(result!.url, "https://multimanager.example.test:8443");
});

test("getRunnerVerser2HostUpstreamParams rejects partial PEM identity", t => {
    const config: STHOutboundVerser2Config = {
        ...baseVerser2Config,
        tls: {
            caFile: "/etc/verser/manager-ca.pem",
            certFile: "/etc/verser/sth-client.crt"
            // keyFile missing -> createVerser2ClientTlsOptions throws
        }
    };

    t.throws(
        () => getRunnerVerser2HostUpstreamParams(config, true),
        { message: "Both verser2 TLS certFile and keyFile must be provided together" }
    );
});
