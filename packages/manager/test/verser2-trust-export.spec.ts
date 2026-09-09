import test from "ava";
import { X509Certificate } from "crypto";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { ManagerConfiguration } from "@scramjet/api-types";
import { getManagerVerser2TrustExport } from "../src/lib/verser2-trust-export";

const certificateFixture = join(__dirname, "fixtures/manager-ca.txt");

async function readCertificateMetadata(certFile: string): Promise<{ certFile: string; expiresAt: string }> {
    const certificate = new X509Certificate(await readFile(certFile, "utf8"));

    return { certFile, expiresAt: new Date(certificate.validTo).toISOString() };
}

function config(certFile: string): ManagerConfiguration {
    return {
        id: "manager-test",
        apiBase: "/api/v1",
        logColors: false,
        logLevel: "info",
        sthController: { unhealthyTimeoutMs: 61_000 },
        verser2: {
            enabled: true,
            host: {
                bindHost: "0.0.0.0",
                bindPort: 2443,
                publicUrl: "https://manager.example.test:2443",
                tls: {
                    caFile: certFile,
                    certFile,
                    keyFile: "/secret/manager-key.pem",
                    pfxFile: "/secret/manager.p12",
                    passphrase: "manager-passphrase",
                    clientAuthCaFile: "/secret/client-ca.pem",
                    mtlsRequired: true
                }
            },
            registration: {
                token: "registration-token",
                allowedClientFingerprints: ["sha256:client"]
            },
            localBroker: {
                peerId: "manager.broker",
                routeDomain: "manager.broker.scramjet.internal"
            },
            localGuest: {
                peerId: "manager.guest",
                routeDomain: "manager.guest.scramjet.internal"
            },
            timeouts: { routeReadinessMs: 1000, leaseAcquireMs: 2000, requestMs: 3000 },
            leases: { minimumWaitingLeases: 1 }
        }
    };
}

test("getManagerVerser2TrustExport returns only public Manager trust metadata", async t => {
    const { expiresAt } = await readCertificateMetadata(certificateFixture);
    const exported = await getManagerVerser2TrustExport(config(certificateFixture));
    const serialized = JSON.stringify(exported);

    t.true(exported.ca.includes("BEGIN CERTIFICATE"));
    t.regex(exported.fingerprint256, /^([A-F0-9]{2}:){31}[A-F0-9]{2}$/);
    t.is(exported.expiresAt, expiresAt);
    t.is(exported.hostUrl, "https://manager.example.test:2443");
    t.deepEqual(exported.routeDomains, {
        broker: "manager.broker.scramjet.internal",
        guest: "manager.guest.scramjet.internal"
    });
    t.false(serialized.includes("manager-key"));
    t.false(serialized.includes("manager-passphrase"));
    t.false(serialized.includes("registration-token"));
    t.false(serialized.includes("client-ca"));
    t.false(serialized.includes("PRIVATE KEY"));
});

test("getManagerVerser2TrustExport keeps the Manager's public trust surface when control ingress is enabled", async t => {
    const configured = config(certificateFixture);
    configured.verser2.controlIngress = {
        enabled: true,
        host: {
            bindHost: "0.0.0.0",
            bindPort: 2444,
            publicUrl: "https://control.manager.example.test:2444",
            tls: { caFile: certificateFixture, certFile: certificateFixture, keyFile: "/secret/control-key.pem", mtlsRequired: true }
        },
        guest: { peerId: "manager.control.guest", routeDomain: "manager.control.example.test" }
    };

    const exported = await getManagerVerser2TrustExport(configured);

    t.is(exported.hostUrl, "https://manager.example.test:2443");
    t.is(exported.routeDomains.guest, "manager.guest.scramjet.internal");
    t.is(exported.routeDomains.broker, "manager.broker.scramjet.internal");
});

test("getManagerVerser2TrustExport fails closed without public CA material", async t => {
    const missing = config("/tmp/missing-ca.pem");

    delete missing.verser2.host.tls.caFile;

    await t.throwsAsync(() => getManagerVerser2TrustExport(missing), {
        message: "Manager verser2 trust export requires host.tls.caFile"
    });
});

test("getManagerVerser2TrustExport refuses non-certificate PEM material", async t => {
    const dir = await mkdtemp(join(tmpdir(), "manager-trust-export-"));
    const privatePem = join(dir, "mixed.pem");
    const mixed = config(privatePem);

    await writeFile(privatePem, "-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----\n", "utf8");
    mixed.verser2.host.tls.caFile = privatePem;

    try {
        await t.throwsAsync(() => getManagerVerser2TrustExport(mixed), {
            message: "Manager verser2 trust export refuses non-certificate PEM material"
        });
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
