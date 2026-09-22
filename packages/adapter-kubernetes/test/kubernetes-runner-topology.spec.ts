import test from "ava";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { defaultConfig } from "@scramjet/config";

const clientPath = require.resolve("../src/kubernetes-client-adapter");

test("kubernetes adapter preserves complete runner connection and transport configuration", async t => {
    const root = mkdtempSync(join(tmpdir(), "scramjet-kube-topology-"));
    const pods: any[] = [];
    class FakeKubernetesClientAdapter {
        logger = { pipe: () => undefined };
        init() { return undefined; }
        async createPod(metadata: any, spec: any) { pods.push({ metadata, spec }); }
        async waitForPodStatus() { return { status: "Running" }; }
        async exec() { return undefined; }
        async isPodsLimitReached() { return false; }
        async deletePod() { return undefined; }
    }
    require.cache[clientPath] = {
        id: clientPath,
        filename: clientPath,
        loaded: true,
        exports: { KubernetesClientAdapter: FakeKubernetesClientAdapter }
    } as NodeJS.Module;
    delete require.cache[require.resolve("../src/kubernetes-instance-adapter")];

    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "kube-proof"));
    writeFileSync(join(root, "kube-proof", "package.json"), "{}");
    const { KubernetesInstanceAdapter } = require("../src/kubernetes-instance-adapter");
    const adapter = new KubernetesInstanceAdapter({ ...defaultConfig, runnerEnvs: {}, adapters: { kubernetes: { namespace: "default", sthPodHost: "10.0.0.1", runnerImages: { node: "runner-node", python3: "runner-python", bun: "runner-bun" }, sequencesRoot: root } }, verser2: {
        ...defaultConfig.verser2, enabled: true, runnerHost: { ...defaultConfig.verser2.runnerHost, enabled: true, ca: "local", host: { ...defaultConfig.verser2.runnerHost.host, publicUrl: "https://runner.example.test:2444" } }, tls: { ca: "manager" }
    } } as any);
    const payload = { appConfig: { logForward: false, marker: "adapter-proof" }, logLevel: "TRACE", forwardRunnerLogs: true, writeDegraded: false, instanceName: "logging-proof", reconnect: false };

    await adapter.init();
    await adapter.dispatch({ id: "kube-proof", type: "kubernetes", sequenceDir: join(root, "kube-proof"), entrypointPath: "index.js", engines: { node: "*" }, limits: {} }, 8125, "inst-kube-proof", { id: "seq-proof", config: { engines: { node: "*" } } }, payload);

    const env = Object.fromEntries(pods[0].spec.containers[0].env.filter((entry: any) => entry.value !== undefined).map((entry: any) => [entry.name, entry.value]));
    t.deepEqual(JSON.parse(env.RUNNER_CONNECT_INFO), payload);
    t.is(env.INSTANCE_ID, "inst-kube-proof");
    t.is(env.INSTANCES_SERVER_HOST, "10.0.0.1");
    t.is(env.INSTANCES_SERVER_PORT, "8125");
    t.deepEqual(JSON.parse(env.SCRAMJET_RUNNER_TRANSPORT_CONFIG), {
        kind: "verser2", hostUrl: "https://runner.example.test:2444", routeDomain: "runner.inst-kube-proof.scramjet.internal", guestId: "runner.inst-kube-proof.guest", hubBrokerId: "runner.inst-kube-proof.hub.broker", hubTargetDomain: defaultConfig.verser2.guest.routeDomain, leaseAcquireTimeoutMs: defaultConfig.verser2.timeouts.leaseAcquireMs, minWaitingStreams: 32, tls: { ca: "local\nmanager" }
    });
});
