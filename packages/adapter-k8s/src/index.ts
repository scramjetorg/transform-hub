/**
 * Adapter module must provide SequenceAdapter, InstanceAdapter classes, init method and name field.
 */
export { KubernetesSequenceAdapter as SequenceAdapter } from "./kubernetes-sequence-adapter";
export { KubernetesInstanceAdapter as InstanceAdapter } from "./kubernetes-instance-adapter";

export const init = (..._args: any[]) => {
    return true;
};

export const name = "kubernetes";
