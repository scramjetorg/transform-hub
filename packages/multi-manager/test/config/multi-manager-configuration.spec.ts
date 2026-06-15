import test from "ava";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { MultiManagerConfig } from "../../src/config/multi-manager-configuration";

test("MultiManagerConfig preserves falsy values from config file", t => {
    const dir = mkdtempSync(join(tmpdir(), "multi-manager-config-"));
    const config = join(dir, "config.json");

    writeFileSync(config, JSON.stringify({
        logColors: false,
        s3: {
            endPoint: "",
            accessKey: "",
            secretKey: "",
            bucket: "",
            port: 9000,
            useSSL: false,
            region: "",
            bucketLimit: 5
        },
        monitoringServer: {
            host: "",
            path: "",
            port: 10000
        }
    }));

    const loaded = new MultiManagerConfig({ config, colors: true, dumpHeap: 0, logLevel: "TRACE", s3AccessKeyId: "", s3SecretAccessKey: "" }).get();

    t.false(loaded.logColors);
    t.false(loaded.s3!.useSSL);
    t.is(loaded.s3!.endPoint, "");
    t.is(loaded.s3!.accessKey, "");
    t.is(loaded.s3!.secretKey, "");
    t.is(loaded.s3!.bucket, "");
    t.is(loaded.s3!.region, "");
    t.is(loaded.monitoringServer!.host, "");
    t.is(loaded.monitoringServer!.path, "");
});

test("MultiManagerConfig defaults to verser2 migration mode", t => {
    const loaded = new MultiManagerConfig({
        colors: true,
        dumpHeap: 0,
        logLevel: "TRACE",
        s3AccessKeyId: "",
        s3SecretAccessKey: ""
    }).get();

    t.true(loaded.verser2.enabled);
    t.is(loaded.verser2.migrationMode, "verser2");
    t.true(loaded.verser2.host.identityDir!.endsWith(".scramjet/verser2-multimanager-host"));
    t.is(loaded.verser2.host.bindPort, 2443);
    t.is(loaded.verser2.host.publicUrl, "https://127.0.0.1:2443");
    t.is(loaded.verser2.localBroker.peerId, "multimanager.default.broker");
    t.is(loaded.verser2.localBroker.routeDomain, "multimanager.default.scramjet.internal");
    t.is(loaded.verser2.localGuest.peerId, "multimanager.default.guest");
    t.is(loaded.verser2.localGuest.routeDomain, "multimanager.default.scramjet.internal");
});

test("MultiManagerConfig loads verser2 config from file env and cli with precedence", t => {
    const dir = mkdtempSync(join(tmpdir(), "multi-manager-config-"));
    const config = join(dir, "config.json");

    writeFileSync(config, JSON.stringify({
        verser2: {
            enabled: false,
            migrationMode: "legacy",
            host: {
                bindHost: "127.0.0.1",
                bindPort: 2443,
                publicUrl: "https://file.example:2443",
                tls: {
                    certFile: "/file/cert.pem",
                    keyFile: "/file/key.pem",
                    mtlsRequired: false
                }
            },
            registration: {
                allowLocalPeers: true,
                allowedClientFingerprints: []
            },
            localBroker: {
                peerId: "file-broker",
                routeDomain: "manager.file.scramjet.internal"
            },
            localGuest: {
                peerId: "file-guest",
                routeDomain: "manager.file.scramjet.internal"
            },
            timeouts: {
                routeReadinessMs: 1000,
                leaseAcquireMs: 2000,
                requestMs: 3000
            },
            leases: {
                minimumWaitingLeases: 1
            }
        }
    }));

    const loaded = new MultiManagerConfig({
        config,
        colors: true,
        dumpHeap: 0,
        logLevel: "TRACE",
        s3AccessKeyId: "",
        s3SecretAccessKey: "",
        verser2HostBindPort: 3443,
        verser2HostKeyFile: "/cli/key.pem"
    }, {
        SCRAMJET_VERSER2_ENABLED: "true",
        SCRAMJET_VERSER2_MIGRATION_MODE: "dual",
        SCRAMJET_VERSER2_HOST_PUBLIC_URL: "https://env.example:2443"
    }).get();

    t.true(loaded.verser2.enabled);
    t.is(loaded.verser2.migrationMode, "dual");
    t.is(loaded.verser2.host.bindHost, "127.0.0.1");
    t.is(loaded.verser2.host.bindPort, 3443);
    t.is(loaded.verser2.host.publicUrl, "https://env.example:2443");
    t.is(loaded.verser2.host.tls.keyFile, "/cli/key.pem");
});

test("MultiManagerConfig masks verser2 secret descriptor paths", t => {
    const config = new MultiManagerConfig({
        colors: true,
        dumpHeap: 0,
        logLevel: "TRACE",
        s3AccessKeyId: "",
        s3SecretAccessKey: "",
        verser2HostKeyFile: "/secret/key.pem",
        verser2HostPassphrase: "changeit",
        verser2RegistrationToken: "token"
    }).getMasked();

    t.is(config.verser2.host.tls.keyFile, "********");
    t.is(config.verser2.host.tls.passphrase, "********");
    t.is(config.verser2.registration.token, "********");
});

test("MultiManagerConfig rejects invalid verser2 config", t => {
    const dir = mkdtempSync(join(tmpdir(), "multi-manager-config-"));
    const config = join(dir, "config.json");

    writeFileSync(config, JSON.stringify({
        verser2: {
            migrationMode: "invalid"
        }
    }));

    t.throws(() => new MultiManagerConfig({ config, colors: true, dumpHeap: 0, logLevel: "TRACE", s3AccessKeyId: "", s3SecretAccessKey: "" }));
});
