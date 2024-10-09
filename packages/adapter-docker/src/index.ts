import { setupDockerNetworking } from "./docker-networking";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
export { DockerSequenceAdapter as SequenceAdapter } from "./docker-sequence-adapter";
export { DockerInstanceAdapter as InstanceAdapter } from "./docker-instance-adapter";

type Command = import("commander").Command;
export function augmentOptions(options: Command): Command {
    return options
        .option("--runner-image <image name>", "Image used by docker runner for Node.js")
        .option("--runner-py-image <image>", "Image used by docker runner for Python")
        .option("--runner-max-mem <mb>", "Maximum mem used by runner")
        .option("--prerunner-image <image name>", "Image used by prerunner")
        .option("--prerunner-max-mem <mb>", "Maximum mem used by prerunner")
}

export async function initialize() {
    if (!await DockerodeDockerHelper.isDockerConfigured()) {
        throw new Error("Docker is not configured.");
    }

    await setupDockerNetworking(new DockerodeDockerHelper());
}

