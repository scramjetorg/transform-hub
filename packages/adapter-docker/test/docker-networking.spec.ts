import test from "ava";
import { getDockerNetworkMode, isHostConnected, resolveDockerNetwork, setupDockerNetworking, STH_DOCKER_NETWORK } from "../src/docker-networking";
import type { IDockerHelper } from "../src/types";

const helper = (overrides: Partial<IDockerHelper> = {}) =>
    ({
        inspectNetwork: async () => ({ containers: {} }),
        listNetworks: async () => [{ Name: STH_DOCKER_NETWORK, IPAM: { Config: [{ Gateway: "172.20.0.1" }] } }],
        createNetwork: async () => undefined,
        connectToNetwork: async () => undefined,
        ...overrides
    }) as IDockerHelper;

test.afterEach.always(() => {
    delete process.env.SCRAMJET_DOCKER_NETWORK_MODE;
});

test.serial("network mode defaults to bridge and rejects invalid values", t => {
    delete process.env.SCRAMJET_DOCKER_NETWORK_MODE;
    t.is(getDockerNetworkMode(), "bridge");
    process.env.SCRAMJET_DOCKER_NETWORK_MODE = "HOST";
    t.is(getDockerNetworkMode(), "host");
    process.env.SCRAMJET_DOCKER_NETWORK_MODE = "invalid";
    t.throws(() => getDockerNetworkMode(), { message: /SCRAMJET_DOCKER_NETWORK_MODE.*bridge.*host/ });
});

test.serial("host mode resolves localhost without bridge operations", async t => {
    process.env.SCRAMJET_DOCKER_NETWORK_MODE = "host";
    const calls: string[] = [];
    const docker = helper({
        inspectNetwork: async () => { calls.push("inspect"); return { containers: {} }; },
        listNetworks: async () => { calls.push("list"); return []; },
        createNetwork: async () => { calls.push("create"); },
        connectToNetwork: async () => { calls.push("connect"); }
    });
    t.deepEqual(await resolveDockerNetwork(docker), { network: "host", host: "127.0.0.1" });
    await setupDockerNetworking(docker);
    t.deepEqual(calls, []);
});

test.serial("bridge mode resolves transformhub0 gateway", async t => {
    delete process.env.SCRAMJET_DOCKER_NETWORK_MODE;
    t.deepEqual(await resolveDockerNetwork(helper()), { network: STH_DOCKER_NETWORK, host: "172.20.0.1" });
});

test.serial("network membership uses the helper's lower-case name contract", t => {
    delete process.env.SCRAMJET_DOCKER_NETWORK_MODE;
    t.true(isHostConnected({ container: { name: "hub-host" } }, "hub-host"));
    t.false(isHostConnected({ container: { name: "other" } }, "hub-host"));
});
