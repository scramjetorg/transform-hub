import { AdapterConfig } from "@scramjet/types";

export { KubernetesSequenceAdapter as SequenceAdapter } from "./kubernetes-sequence-adapter";
export { KubernetesInstanceAdapter as InstanceAdapter } from "./kubernetes-instance-adapter";

export function extendConfig() {

}

export async function initialize(config: AdapterConfig) {
    if (!config.sthPodHost) {
        throw new Error("Kubernetes pod host url is not set in kubernetes.sthPodHost config.");
    }
}
