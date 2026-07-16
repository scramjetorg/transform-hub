import test from "ava";
import { ManagerConfiguration } from "@scramjet/api-types";
import { maskManagerConfig } from "../src/lib/manager";

function fullConfig(): ManagerConfiguration {
    return {
        id: "test-manager",
        apiBase: "/api/v1",
        logColors: true,
        logLevel: "info",
        sthController: { unhealthyTimeoutMs: 61_000 },
        s3: {
            accessKey: "AKIAIOSFODNN7EXAMPLE",
            secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            bucket: "my-bucket",
            region: "us-east-1",
            endpoint: "https://s3.example.com",
            signatureVersion: "v4",
        },
        verser2: {
            enabled: true,
            host: {
                identityDir: "/tmp/manager-verser2",
                bindHost: "0.0.0.0",
                bindPort: 2443,
                publicUrl: "https://manager.example.test:2443",
                tls: {
                    caFile: "/safe/ca.pem",
                    certFile: "/safe/cert.pem",
                    keyFile: "/secret/key.pem",
                    pfxFile: "/secret/manager.p12",
                    passphrase: "manager-passphrase",
                    clientAuthCaFile: "/safe/client-ca.pem",
                    mtlsRequired: false,
                },
            },
            registration: {
                token: "registration-token",
                allowedClientFingerprints: ["sha256:abc"],
            },
            localBroker: {
                peerId: "manager.broker",
                routeDomain: "manager.broker.scramjet.internal",
            },
            localGuest: {
                peerId: "manager.guest",
                routeDomain: "manager.guest.scramjet.internal",
            },
            timeouts: {
                routeReadinessMs: 10_000,
                leaseAcquireMs: 10_000,
                requestMs: 30_000,
            },
            leases: {
                minimumWaitingLeases: 1,
            },
        },
        csrEnrollment: {
            enabled: true,
            operatorApproval: "operator-secret",
            storageDir: "/private/grants",
            caKeyFile: "/private/ca.key",
            caCertFile: "/private/ca.cert"
        }
    };
}

test("maskManagerConfig redacts CSR enrollment approval and private paths", t => {
    const masked = maskManagerConfig(fullConfig()) as any;
    t.is(masked.csrEnrollment.operatorApproval, "********");
    t.is(masked.csrEnrollment.storageDir, "********");
    t.is(masked.csrEnrollment.caKeyFile, "********");
    t.is(masked.csrEnrollment.caCertFile, "********");
});

test("maskManagerConfig redacts S3 accessKey", t => {
    const masked = maskManagerConfig(fullConfig());

    t.is(masked.s3?.accessKey, "********");
});

test("maskManagerConfig redacts S3 secretKey", t => {
    const masked = maskManagerConfig(fullConfig());

    t.is(masked.s3?.secretKey, "********");
});

test("maskManagerConfig preserves S3 non-secret fields", t => {
    const masked = maskManagerConfig(fullConfig());

    t.is(masked.s3?.bucket, "my-bucket");
    t.is(masked.s3?.region, "us-east-1");
    t.is(masked.s3?.endpoint, "https://s3.example.com");
});

test("maskManagerConfig redacts verser2 host keyFile", t => {
    const masked = maskManagerConfig(fullConfig());

    t.is(masked.verser2.host.tls.keyFile, "********");
});

test("maskManagerConfig redacts verser2 host pfxFile and passphrase", t => {
    const masked = maskManagerConfig(fullConfig());

    t.is(masked.verser2.host.tls.pfxFile, "********");
    t.is(masked.verser2.host.tls.passphrase, "********");
});

test("maskManagerConfig redacts verser2 registration token", t => {
    const masked = maskManagerConfig(fullConfig());

    t.is(masked.verser2.registration.token, "********");
});

test("maskManagerConfig preserves verser2 non-secret fields", t => {
    const masked = maskManagerConfig(fullConfig());

    t.is(masked.verser2.host.tls.caFile, "/safe/ca.pem");
    t.is(masked.verser2.host.tls.certFile, "/safe/cert.pem");
    t.is(masked.verser2.host.tls.clientAuthCaFile, "/safe/client-ca.pem");
    t.is(masked.verser2.host.publicUrl, "https://manager.example.test:2443");
    t.is(masked.verser2.host.bindPort, 2443);
    t.is(masked.verser2.localBroker.peerId, "manager.broker");
    t.is(masked.verser2.localGuest.routeDomain, "manager.guest.scramjet.internal");
    t.deepEqual(masked.verser2.registration.allowedClientFingerprints, ["sha256:abc"]);
});

test("maskManagerConfig returns a cloned copy, not the original", t => {
    const original = fullConfig();

    const masked = maskManagerConfig(original);

    t.not(masked, original, "not same reference");
    t.not(masked.verser2, original.verser2, "nested object not same reference");
    t.not(masked.verser2.host.tls, original.verser2.host.tls, "deeply nested object not same reference");
});

test("maskManagerConfig handles missing s3 gracefully", t => {
    const config = fullConfig();

    delete config.s3;

    const masked = maskManagerConfig(config);

    t.is(masked.s3, undefined, "s3 absent when input had none");
    t.is(masked.verser2.host.tls.keyFile, "********");
});

test("maskManagerConfig handles missing verser2 registration token gracefully", t => {
    const config = fullConfig();

    delete config.verser2.registration.token;

    const masked = maskManagerConfig(config);

    t.is(masked.verser2.registration.token, undefined);
});

test("maskManagerConfig preserves manager identity fields", t => {
    const masked = maskManagerConfig(fullConfig());

    t.is(masked.id, "test-manager");
    t.is(masked.logLevel, "info");
    t.is(masked.apiBase, "/api/v1");
});
