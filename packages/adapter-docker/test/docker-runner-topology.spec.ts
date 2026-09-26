import test from "ava";
import { PassThrough } from "stream";
import { defaultConfig } from "@scramjet/config";

const dockerNetworkingPath = require.resolve("../src/docker-networking");
const dockerHelperPath = require.resolve("../src/dockerode-docker-helper");

function installDockerStubs(calls: any[]) {
    require.cache[dockerNetworkingPath] = {
        id: dockerNetworkingPath,
        filename: dockerNetworkingPath,
        loaded: true,
        exports: {
            STH_DOCKER_NETWORK: "transformhub0",
            isHostSpawnedInDockerContainer: async () => false,
            getHostname: () => "test-host"
        }
    } as NodeJS.Module;
    class FakeDockerHelper {
        logger = { updateBaseLog: () => undefined, pipe: () => undefined };
        listNetworks = async () => [{ Name: "transformhub0", IPAM: { Config: [{ Gateway: "172.30.0.1" }] } }];
        run = async (config: any) => {
            calls.push(config);
            return { containerId: "container-proof", streams: { stdout: new PassThrough(), stderr: new PassThrough() } };
        };
    }
    require.cache[dockerHelperPath] = {
        id: dockerHelperPath,
        filename: dockerHelperPath,
        loaded: true,
        exports: { DockerodeDockerHelper: FakeDockerHelper }
    } as NodeJS.Module;
}

test("docker adapter preserves complete runner connection and transport configuration", async t => {
    const calls: any[] = [];
    installDockerStubs(calls);
    delete require.cache[require.resolve("../src/docker-instance-adapter")];
    const { DockerInstanceAdapter } = require("../src/docker-instance-adapter");
    const adapter = new DockerInstanceAdapter({ ...defaultConfig, runnerEnvs: {}, verser2: {
        ...defaultConfig.verser2,
        enabled: true,
        runnerHost: { ...defaultConfig.verser2.runnerHost, enabled: true, ca: "local", host: { ...defaultConfig.verser2.runnerHost.host, publicUrl: "https://runner.example.test:2444" } },
        tls: { ca: "manager" }
    } } as any);
    const payload = { appConfig: { logForward: false, marker: "adapter-proof" }, logLevel: "TRACE", forwardRunnerLogs: true, writeDegraded: false, instanceName: "logging-proof", reconnect: false };

    await adapter.dispatch({ id: "docker-proof", name: "proof", type: "docker", sequenceDir: "/tmp/sequence", entrypointPath: "index.js", engines: { node: "*" }, limits: {}, container: { image: "runner-proof", hostIp: "127.0.0.1", exposePortsRange: [3000, 3001] } }, 8124, "inst-docker-proof", { id: "seq-proof", config: { engines: { node: "*" } } }, payload);

    const env = Object.fromEntries(calls[0].envs.map((entry: string) => entry.split(/=(.*)/s, 2)));
    t.deepEqual(JSON.parse(env.RUNNER_CONNECT_INFO), payload);
    t.is(env.INSTANCE_ID, "inst-docker-proof");
    t.is(env.INSTANCES_SERVER_HOST, "172.30.0.1");
    t.is(env.INSTANCES_SERVER_PORT, "8124");
    t.deepEqual(JSON.parse(env.SCRAMJET_RUNNER_TRANSPORT_CONFIG), {
        kind: "verser2", hostUrl: "https://runner.example.test:2444", routeDomain: "runner.inst-docker-proof.scramjet.internal", guestId: "runner.inst-docker-proof.guest", hubBrokerId: "runner.inst-docker-proof.hub.broker", hubTargetDomain: defaultConfig.verser2.guest.routeDomain, leaseAcquireTimeoutMs: defaultConfig.verser2.timeouts.leaseAcquireMs, minWaitingStreams: 32, tls: { ca: "local\nmanager" }
    });
});
