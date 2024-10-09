import { IAdapterAugmentation, STHConfiguration } from "@scramjet/types";
import { setupDockerNetworking } from "./docker-networking";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import { DockerSequenceAdapter } from "./docker-sequence-adapter";
import { DockerInstanceAdapter } from "./docker-instance-adapter";

type Command = import("commander").Command;
function augmentOptions(options: Command): Command {
    return options
        // .option("--docker-socket <socket>", "Docker socket path", "/var/run/docker.sock")
        // .option("--docker-host <host>", "Docker host:port (will override socket connection)")
        .option("--runner-image <image name>", "Image used by docker runner for Node.js")
        .option("--runner-py-image <image>", "Image used by docker runner for Python")
        .option("--runner-max-mem <mb>", "Maximum mem used by runner")
        .option("--prerunner-image <image name>", "Image used by prerunner")
        .option("--prerunner-max-mem <mb>", "Maximum mem used by prerunner")
}

async function initialize() {
    if (!await DockerodeDockerHelper.isDockerConfigured()) {
        throw new Error("Docker is not configured.");
    }

    await setupDockerNetworking(new DockerodeDockerHelper());
}


function augmentConfig(config: STHConfiguration) {
    config.adapters.docker = {
        name: "docker",
        ...config.docker
    };

    return config;
}

export function augment() {
    return {
        initialize,
        augmentOptions,
        augmentConfig,
        SequenceAdapterClass: DockerSequenceAdapter,
        LifeCycleAdapterClass: DockerInstanceAdapter
    } as IAdapterAugmentation
}
