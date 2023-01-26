import { STHConfiguration } from "@scramjet/types";
import { setupDockerNetworking } from "./docker-networking";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";

export async function initializeRuntimeAdapters(config: STHConfiguration): Promise<string> {
    if (config.runtimeAdapter === "detect") {
        if (await DockerodeDockerHelper.isDockerConfigured()) {
            config.runtimeAdapter = "docker";
        } else {
            config.runtimeAdapter = "process";
        }
    }

    if (config.runtimeAdapter === "docker") {
        await setupDockerNetworking(new DockerodeDockerHelper());
    }

    return config.runtimeAdapter;
}
