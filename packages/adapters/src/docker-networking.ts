import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import * as fs from "fs/promises";
import * as os from "os";

export const isHostSpawnedInDockerContainer = async () => await fs.access("/.dockerenv").then(() => true, () => false);

export const getHostname = () => os.hostname();

export const DOCKER_NETWORK_NAME = "transformhub0";

// @TODO this could be encapsulated into IInstanceAdapter for doing something on Transform Hub launch
export async function setupDockerNetworking(dockerHelper: DockerodeDockerHelper) {
    if (await isHostSpawnedInDockerContainer() === false) {
        return;
    }

    const network = dockerHelper.dockerode.getNetwork(DOCKER_NETWORK_NAME);

    const networkExists = await network.inspect().then(() => true, () => false);

    if (!networkExists) {
        await dockerHelper.dockerode.createNetwork({
            Name: DOCKER_NETWORK_NAME,
            Driver: "bridge",
            Options: {
                "com.docker.network.bridge.host_binding_ipv4":"0.0.0.0",
                "com.docker.network.bridge.enable_ip_masquerade":"true",
                "com.docker.network.bridge.enable_icc":"true",
                "com.docker.network.driver.mtu":"1500"
            }
        });
    }

    const containers = (await network.inspect()).Containers;

    const hostname = getHostname();

    const isHostConnected = !!Object.entries(containers).find(
        ([id, { Name }]: [string, any]) => id.startsWith(hostname) || Name === hostname
    );

    if (!isHostConnected) {
        await network.connect({ Container: hostname });
    }
}
