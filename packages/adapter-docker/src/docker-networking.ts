import fs from "fs/promises";
import os from "os";
import { IDockerHelper } from "./types";

export const isHostSpawnedInDockerContainer = async () => await fs.access("/.dockerenv").then(() => true, () => false);

export const getHostname = () => os.hostname();

export const STH_DOCKER_NETWORK = "transformhub0";

export type DockerNetworkMode = "bridge" | "host";

export const getDockerNetworkMode = (value = process.env.SCRAMJET_DOCKER_NETWORK_MODE): DockerNetworkMode => {
    if (!value) return "bridge";
    const mode = value.toLowerCase();
    if (mode === "bridge" || mode === "host") return mode;
    throw new Error(`Invalid SCRAMJET_DOCKER_NETWORK_MODE "${value}"; expected "bridge" or "host".`);
};

export const isHostConnected = (containers: Record<string, { name: string }>, hostname: string) =>
    Object.entries(containers).some(([id, { name }]) => id.startsWith(hostname) || name === hostname);

// @TODO this could be encapsulated into IInstanceAdapter for doing something on Transform Hub launch
export async function setupDockerNetworking(dockerHelper: IDockerHelper) {
    if (getDockerNetworkMode() === "host") return;

    const networkExists = await dockerHelper.inspectNetwork(STH_DOCKER_NETWORK).then(() => true, () => false);

    if (!networkExists) {
        await dockerHelper.createNetwork({
            name: STH_DOCKER_NETWORK,
            driver: "bridge",
            options: {
                "com.docker.network.bridge.host_binding_ipv4":"0.0.0.0",
                "com.docker.network.bridge.enable_ip_masquerade":"true",
                "com.docker.network.bridge.enable_icc":"true",
                "com.docker.network.driver.mtu":"1500"
            }
        });
    }

    if (await isHostSpawnedInDockerContainer()) {
        const { containers } = await dockerHelper.inspectNetwork(STH_DOCKER_NETWORK);

        const hostname = getHostname();

        const isHostContainerConnected = isHostConnected(containers, hostname);

        if (!isHostContainerConnected) {
            await dockerHelper.connectToNetwork(STH_DOCKER_NETWORK, hostname);
        }
    }
}

export async function resolveDockerNetwork(dockerHelper: IDockerHelper): Promise<{ network: string; host: string }> {
    if (getDockerNetworkMode() === "host") {
        return { network: "host", host: "127.0.0.1" };
    }

    const interfaces = await dockerHelper.listNetworks();
    const sthDockerNetwork = interfaces.find((net) => net.Name === STH_DOCKER_NETWORK);

    if (!sthDockerNetwork) {
        throw new Error(`Couldn't find sth docker network: ${STH_DOCKER_NETWORK}`);
    }

    if (await isHostSpawnedInDockerContainer()) {
        return { network: STH_DOCKER_NETWORK, host: getHostname() };
    }

    const sthNetworkGateway = sthDockerNetwork.IPAM?.Config?.[0]?.Gateway;
    if (!sthNetworkGateway) {
        throw new Error(`Couldn't determine gateway for ${STH_DOCKER_NETWORK}`);
    }

    return { network: STH_DOCKER_NETWORK, host: sthNetworkGateway };
}
