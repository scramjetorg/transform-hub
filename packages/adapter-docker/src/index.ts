import { IAdapterAugmentation, RuntimeOptionRegistry, STHConfiguration } from "@scramjet/types";

function augmentOptions(options: RuntimeOptionRegistry): RuntimeOptionRegistry {
    return options
        // .option("--docker-socket <socket>", "Docker socket path", "/var/run/docker.sock")
        // .option("--docker-host <host>", "Docker host:port (will override socket connection)")
        .option({ name: "runnerImage", flag: "runner-image", type: "string", description: "Image used by docker runner for Node.js" })
        .option({ name: "runnerPyImage", flag: "runner-py-image", type: "string", description: "Image used by docker runner for Python" })
        .option({ name: "runnerBunImage", flag: "runner-bun-image", type: "string", description: "Image used by docker runner for Bun" })
        .option({ name: "runnerMaxMem", flag: "runner-max-mem", type: "number", description: "Maximum mem used by runner" })
        .option({ name: "prerunnerImage", flag: "prerunner-image", type: "string", description: "Image used by prerunner" })
        .option({ name: "prerunnerMaxMem", flag: "prerunner-max-mem", type: "number", description: "Maximum mem used by prerunner" });
}

async function initialize() {
    const { DockerodeDockerHelper } = await import("./dockerode-docker-helper");
    const { setupDockerNetworking } = await import("./docker-networking");

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
    const { DockerSequenceAdapter } = require("./docker-sequence-adapter") as typeof import("./docker-sequence-adapter");
    const { DockerInstanceAdapter } = require("./docker-instance-adapter") as typeof import("./docker-instance-adapter");

    return {
        initialize,
        augmentOptions,
        augmentConfig,
        SequenceAdapterClass: DockerSequenceAdapter,
        LifeCycleAdapterClass: DockerInstanceAdapter
    } as IAdapterAugmentation;
}
