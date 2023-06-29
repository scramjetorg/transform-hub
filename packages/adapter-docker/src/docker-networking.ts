import fs from "fs/promises";
import os from "os";
import { IDockerHelper } from "./types";

export const isHostSpawnedInDockerContainer = async () => await fs.access("/.dockerenv").then(() => true, () => false);

export const getHostname = () => os.hostname();

export const STH_DOCKER_NETWORK = "transformhub0";

// @TODO this could be encapsulated into IInstanceAdapter for doing something on Transform Hub launch
export async function setupDockerNetworking(dockerHelper: IDockerHelper) {
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

        const isHostConnected = !!Object.entries(containers).find(
            ([id, { Name }]: [string, any]) => id.startsWith(hostname) || Name === hostname
        );

        if (!isHostConnected) {
            await dockerHelper.connectToNetwork(STH_DOCKER_NETWORK, hostname);
        }
    }
}
