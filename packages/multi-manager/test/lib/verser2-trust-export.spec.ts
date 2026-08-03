import test from "ava";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { ManagerVerser2Config } from "@scramjet/types";
import { resolveManagerVerser2HostConfig } from "../../src/lib/verser2-host-identity";
import { getMultiManagerVerser2TrustExport } from "../../src/lib/verser2-trust-export";

function verser2(identityDir?: string): ManagerVerser2Config {
    return {
        enabled: true,
        host: {
            bindHost: "0.0.0.0",
            bindPort: 2443,
            publicUrl: "https://multimanager.example.test:2443",
            identityDir,
            tls: { mtlsRequired: false }
        },
        registration: { allowedClientFingerprints: [] },
        localBroker: { peerId: "mm.broker", routeDomain: "multimanager.broker.scramjet.internal" },
        localGuest: { peerId: "mm.guest", routeDomain: "multimanager.guest.scramjet.internal" },
        timeouts: { routeReadinessMs: 1000, leaseAcquireMs: 2000, requestMs: 3000 },
        leases: { minimumWaitingLeases: 1 }
    };
}

test("getMultiManagerVerser2TrustExport uses MultiManager Host trust and selected Manager route", async t => {
    const identityDir = await mkdtemp(join(tmpdir(), "multi-manager-trust-"));

    try {
        const config = await resolveManagerVerser2HostConfig(verser2(identityDir), "MultiManager");
        const exported = await getMultiManagerVerser2TrustExport(config, {
            verser2: {
                ...config,
                host: {
                    ...config.host,
                    publicUrl: "https://wrong-sub-manager.example.test:2443"
                },
                localGuest: { peerId: "manager.guest", routeDomain: "manager.selected.scramjet.internal" }
            }
        });
        const serialized = JSON.stringify(exported);

        t.true(exported.ca.includes("BEGIN CERTIFICATE"));
        t.regex(exported.fingerprint256, /^([A-F0-9]{2}:){31}[A-F0-9]{2}$/);
        t.true(new Date(exported.expiresAt).getTime() > Date.now());
        t.is(exported.hostUrl, "https://multimanager.example.test:2443");
        t.deepEqual(exported.routeDomains, {
            broker: "multimanager.broker.scramjet.internal",
            guest: "manager.selected.scramjet.internal"
        });
        t.false(serialized.includes("wrong-sub-manager"));
        t.false(serialized.includes("server-key.pem"));
        t.false(serialized.includes("PRIVATE KEY"));
    } finally {
        await rm(identityDir, { recursive: true, force: true });
    }
});

test("getMultiManagerVerser2TrustExport fails closed without public CA material", async t => {
    const config = verser2();

    delete config.host.tls.caFile;

    await t.throwsAsync(() => getMultiManagerVerser2TrustExport(config), {
        message: "MultiManager verser2 trust export requires host.tls.caFile"
    });
});
