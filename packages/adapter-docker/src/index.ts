import { DockerodeDockerHelper } from "./dockerode-docker-helper";

/**
 * Adapter module must provide SequenceAdapter, InstanceAdapter classes, init method and name field.
 */
export { DockerSequenceAdapter as SequenceAdapter } from "./docker-sequence-adapter";
export { DockerInstanceAdapter as InstanceAdapter } from "./docker-instance-adapter";

export const init = async (..._args: any[]) => {
    return await DockerodeDockerHelper.isDockerConfigured() ? {} : { error: "Docker initialization failed" };
};

export const name = "docker";
