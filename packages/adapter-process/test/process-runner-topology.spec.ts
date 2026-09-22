import test from "ava";
import { PassThrough } from "stream";
import { defaultConfig } from "@scramjet/config";

const originalChildProcess = require("child_process");
const childProcessPath = require.resolve("child_process");

function installSpawnStub(calls: any[]) {
    const childProcessExports = { ...originalChildProcess };

    childProcessExports.spawn = (command: string, args: string[], options: any) => {
        calls.push({ command, args, options });

        return {
            stdout: new PassThrough(),
            stderr: new PassThrough(),
            unref: () => undefined,
            on: () => undefined
        };
    };

    require.cache[childProcessPath] = {
        id: childProcessPath,
        filename: childProcessPath,
        loaded: true,
        exports: childProcessExports
    } as NodeJS.Module;
}

test("process adapter preserves an explicitly configured legacy 2444 runner Host", async t => {
    const spawnCalls: any[] = [];

    installSpawnStub(spawnCalls);
    delete require.cache[require.resolve("../src/process-instance-adapter")];

    const { ProcessInstanceAdapter } = require("../src/process-instance-adapter");
    const adapter = new ProcessInstanceAdapter({
        ...defaultConfig,
        runnerEnvs: {},
        debug: false,
        verser2: {
            ...defaultConfig.verser2,
            enabled: true,
            hostUrl: "https://manager.example.test:2443",
            broker: { peerId: "sth.broker", targetDomain: "manager.guest.scramjet.internal" },
            guest: { peerId: "sth.guest", routeDomain: "sth.local.scramjet.internal" },
            tls: { ca: "-----BEGIN CERTIFICATE-----\nmanager\n-----END CERTIFICATE-----" },
            runnerHost: {
                enabled: true,
                identityDir: "/tmp/sth-runner-host",
                ca: "-----BEGIN CERTIFICATE-----\nsth-local\n-----END CERTIFICATE-----",
                host: {
                    bindHost: "127.0.0.1",
                    bindPort: 2444,
                    publicUrl: "https://sth-local.example.test:2444",
                    tls: { mtlsRequired: false }
                },
                registration: { allowedClientFingerprints: [] },
                localBroker: { peerId: "sth.runner.broker" }
            }
        }
    });

    await adapter.dispatch({
        id: "instance-config",
        type: "process",
        sequenceDir: "/tmp/sequence",
        entrypointPath: "index.js",
        engines: { node: "*" }
    } as any, 8001, "inst-process-1", {
        id: "seq-1",
        config: { type: "process", engines: { node: "*" } }
    } as any, { reconnect: false } as any);

    t.is(spawnCalls.length, 1);

    const env = spawnCalls[0].options.env;
    const parsed = JSON.parse(env.SCRAMJET_RUNNER_TRANSPORT_CONFIG);

    t.is(parsed.kind, "verser2");
    t.is(parsed.hostUrl, "https://sth-local.example.test:2444");
    t.not(parsed.hostUrl, "https://manager.example.test:2443");
    t.is(parsed.hubTargetDomain, "sth.local.scramjet.internal");
    t.not(parsed.hubTargetDomain, "manager.guest.scramjet.internal");
    t.is(parsed.tls.ca, "-----BEGIN CERTIFICATE-----\nsth-local\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nmanager\n-----END CERTIFICATE-----");
});

test("process adapter launches the explicit runner bin", t => {
    delete require.cache[require.resolve("../src/process-instance-adapter")];
    const { ProcessInstanceAdapter } = require("../src/process-instance-adapter");
    const adapter = new ProcessInstanceAdapter({ ...defaultConfig, runnerEnvs: {} });
    const command = adapter.getRunnerCmd({ engines: { node: "*" } } as any);
    t.regex(command[command.length - 1], /[\\/]start-runner\.(?:ts|js)$/);
});

test("process adapter preserves complete runner connection and transport configuration", async t => {
    const spawnCalls: any[] = [];

    installSpawnStub(spawnCalls);
    delete require.cache[require.resolve("../src/process-instance-adapter")];

    const { ProcessInstanceAdapter } = require("../src/process-instance-adapter");
    const adapter = new ProcessInstanceAdapter({
        ...defaultConfig,
        runnerEnvs: {},
        verser2: {
            ...defaultConfig.verser2,
            enabled: true,
            runnerHost: {
                ...defaultConfig.verser2.runnerHost,
                enabled: true,
                ca: "-----BEGIN CERTIFICATE-----\nlocal\n-----END CERTIFICATE-----",
                host: { ...defaultConfig.verser2.runnerHost.host, publicUrl: "https://runner.example.test:2444" }
            },
            tls: { ca: "-----BEGIN CERTIFICATE-----\nmanager\n-----END CERTIFICATE-----" }
        }
    });
    const payload = {
        appConfig: { logForward: false, marker: "adapter-proof" },
        logLevel: "TRACE",
        forwardRunnerLogs: true,
        writeDegraded: false,
        instanceName: "logging-proof",
        reconnect: false
    };

    await adapter.dispatch({
        id: "instance-config",
        type: "process",
        sequenceDir: "/tmp/sequence",
        entrypointPath: "index.js",
        engines: { node: "*" }
    }, 8123, "inst-process-proof", { id: "seq-proof", config: { type: "process", engines: { node: "*" } } }, payload);

    const env = spawnCalls[0].options.env;
    t.deepEqual(JSON.parse(env.RUNNER_CONNECT_INFO), payload);
    t.is(env.INSTANCE_ID, "inst-process-proof");
    t.is(env.INSTANCES_SERVER_HOST, "127.0.0.1");
    t.is(env.INSTANCES_SERVER_PORT, "8123");
    t.deepEqual(JSON.parse(env.SCRAMJET_RUNNER_TRANSPORT_CONFIG), {
        kind: "verser2",
        hostUrl: "https://runner.example.test:2444",
        routeDomain: "runner.inst-process-proof.scramjet.internal",
        guestId: "runner.inst-process-proof.guest",
        hubBrokerId: "runner.inst-process-proof.hub.broker",
        hubTargetDomain: defaultConfig.verser2.guest.routeDomain,
        leaseAcquireTimeoutMs: defaultConfig.verser2.timeouts.leaseAcquireMs,
        minWaitingStreams: 32,
        tls: { ca: "-----BEGIN CERTIFICATE-----\nlocal\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nmanager\n-----END CERTIFICATE-----" }
    });
});
