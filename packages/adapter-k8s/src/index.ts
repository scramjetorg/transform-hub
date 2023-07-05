/**
 * Adapter module must provide SequenceAdapter, InstanceAdapter classes, init method and name field.
 */
export { KubernetesSequenceAdapter as SequenceAdapter } from "./kubernetes-sequence-adapter";
export { KubernetesInstanceAdapter as InstanceAdapter } from "./kubernetes-instance-adapter";

export const init = async (..._args: any[]) => {
    return Promise.resolve({ });
};

export const name = "kubernetes";
