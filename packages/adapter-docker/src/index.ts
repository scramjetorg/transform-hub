import { setupDockerNetworking } from "./docker-networking";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
export { DockerSequenceAdapter as SequenceAdapter } from "./docker-sequence-adapter";
export { DockerInstanceAdapter as InstanceAdapter } from "./docker-instance-adapter";

export async function initialize() {
    if (!await DockerodeDockerHelper.isDockerConfigured()) {
        throw new Error("Docker is not configured.");
    }

    await setupDockerNetworking(new DockerodeDockerHelper());
}
