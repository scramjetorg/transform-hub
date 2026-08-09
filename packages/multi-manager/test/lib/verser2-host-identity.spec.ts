import test from "ava";
import { ManagerVerser2Config } from "@scramjet/types";
import { existsSync } from "fs";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { resolveManagerVerser2HostConfig } from "../../src/lib/verser2-host-identity";

const baseConfig = (identityDir: string): ManagerVerser2Config => ({
    enabled: true,
    host: {
        identityDir,
        bindHost: "127.0.0.1",
        bindPort: 2443,
        publicUrl: "https://127.0.0.1:2443",
        tls: {
            mtlsRequired: false
        }
    },
    registration: {
        allowedClientFingerprints: []
    },
    localBroker: {
        peerId: "manager.test.broker",
        routeDomain: "manager.test.scramjet.internal"
    },
    localGuest: {
        peerId: "manager.test.guest",
        routeDomain: "manager.test.scramjet.internal"
    },
    timeouts: {
        routeReadinessMs: 1000,
        leaseAcquireMs: 2000,
        requestMs: 3000
    },
    leases: {
        minimumWaitingLeases: 1
    }
});

async function tempIdentityDir(): Promise<string> {
    return mkdtemp(join(tmpdir(), "manager-verser2-host-"));
}

test("resolveManagerVerser2HostConfig generates and reuses local Host identity", async t => {
    const identityDir = await tempIdentityDir();

    try {
        const resolved = await resolveManagerVerser2HostConfig(baseConfig(identityDir), "Manager");

        t.is(resolved.host.tls.caFile, join(identityDir, "ca.pem"));
        t.is(resolved.host.tls.certFile, join(identityDir, "server-cert.pem"));
        t.is(resolved.host.tls.keyFile, join(identityDir, "server-key.pem"));
        t.true(existsSync(resolved.host.tls.caFile!));
        t.true(existsSync(resolved.host.tls.certFile!));
        t.true(existsSync(resolved.host.tls.keyFile!));

        const reused = await resolveManagerVerser2HostConfig(baseConfig(identityDir), "Manager");

        t.is(reused.host.tls.caFile, resolved.host.tls.caFile);
        t.is(reused.host.tls.certFile, resolved.host.tls.certFile);
        t.is(reused.host.tls.keyFile, resolved.host.tls.keyFile);
    } finally {
        await rm(identityDir, { recursive: true, force: true });
    }
});

test("resolveManagerVerser2HostConfig preserves explicit TLS identity", async t => {
    const identityDir = await tempIdentityDir();
    const generated = await resolveManagerVerser2HostConfig(baseConfig(identityDir), "Manager");
    const config = baseConfig(identityDir);

    config.host.tls = {
        certFile: generated.host.tls.certFile,
        keyFile: generated.host.tls.keyFile,
        mtlsRequired: false
    };

    try {
        const resolved = await resolveManagerVerser2HostConfig(config, "Manager");

        t.is(resolved, config);
        t.is(resolved.host.tls.certFile, generated.host.tls.certFile);
        t.is(resolved.host.tls.keyFile, generated.host.tls.keyFile);
    } finally {
        await rm(identityDir, { recursive: true, force: true });
    }
});

test("resolveManagerVerser2HostConfig rejects partial generated identity", async t => {
    const identityDir = await tempIdentityDir();

    try {
        await writeFile(join(identityDir, "ca.pem"), "partial", { mode: 0o644 });

        await t.throwsAsync(() => resolveManagerVerser2HostConfig(baseConfig(identityDir), "Manager"), {
            message: `Incomplete Manager verser2 Host identity in ${identityDir}`
        });
    } finally {
        await rm(identityDir, { recursive: true, force: true });
    }
});
