/**
 * Adapter module must provide SequenceAdapter, InstanceAdapter classes, init method and name field.
 */
export { DockerSequenceAdapter as SequenceAdapter } from "./docker-sequence-adapter";
export { DockerInstanceAdapter as InstanceAdapter } from "./docker-instance-adapter";

export const init = (..._args: any[]) => {
    return true;
};

export const name = "docker";
