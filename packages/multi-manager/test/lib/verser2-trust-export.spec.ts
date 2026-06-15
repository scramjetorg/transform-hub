import test from "ava";
import { join } from "path";
import { ManagerVerser2Config } from "@scramjet/types";
import { getMultiManagerVerser2TrustExport } from "../../src/lib/verser2-trust-export";

const caFile = join(__dirname, "../../../verser/test/cert/myCA.pem");

function verser2(): ManagerVerser2Config {
    return {
        enabled: true,
        host: {
            bindHost: "0.0.0.0",
            bindPort: 2443,
            publicUrl: "https://multimanager.example.test:2443",
            tls: { caFile, certFile: "/server.crt", keyFile: "/server.key", mtlsRequired: false }
        },
        registration: { allowLocalPeers: true, allowedClientFingerprints: [] },
        localBroker: { peerId: "mm.broker", routeDomain: "multimanager.broker.scramjet.internal" },
        localGuest: { peerId: "mm.guest", routeDomain: "multimanager.guest.scramjet.internal" },
        timeouts: { routeReadinessMs: 1000, leaseAcquireMs: 2000, requestMs: 3000 },
        leases: { minimumWaitingLeases: 1 }
    };
}

test("getMultiManagerVerser2TrustExport uses MultiManager Host trust and selected Manager route", async t => {
    const exported = await getMultiManagerVerser2TrustExport(verser2(), {
        verser2: {
            ...verser2(),
            host: {
                ...verser2().host,
                publicUrl: "https://wrong-sub-manager.example.test:2443"
            },
            localGuest: { peerId: "manager.guest", routeDomain: "manager.selected.scramjet.internal" }
        }
    });
    const serialized = JSON.stringify(exported);

    t.true(exported.ca.includes("BEGIN CERTIFICATE"));
    t.regex(exported.fingerprint256, /^([A-F0-9]{2}:){31}[A-F0-9]{2}$/);
    t.is(exported.expiresAt, "2028-09-17T13:16:09.000Z");
    t.is(exported.hostUrl, "https://multimanager.example.test:2443");
    t.deepEqual(exported.routeDomains, {
        broker: "multimanager.broker.scramjet.internal",
        guest: "manager.selected.scramjet.internal"
    });
    t.false(serialized.includes("wrong-sub-manager"));
    t.false(serialized.includes("server.key"));
    t.false(serialized.includes("PRIVATE KEY"));
});

test("getMultiManagerVerser2TrustExport fails closed without public CA material", async t => {
    const config = verser2();

    delete config.host.tls.caFile;

    await t.throwsAsync(() => getMultiManagerVerser2TrustExport(config), {
        message: "MultiManager verser2 trust export requires host.tls.caFile"
    });
});
