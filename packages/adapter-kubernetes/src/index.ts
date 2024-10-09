import { AdapterConfig, IAdapterAugmentation, STHConfiguration } from "@scramjet/types";
import { KubernetesSequenceAdapter } from "./kubernetes-sequence-adapter";
import { KubernetesInstanceAdapter } from "./kubernetes-instance-adapter";
import { initializeImports } from "./kubernetes-client-adapter";

type Command = import("commander").Command;
export function augmentOptions(options: Command): Command {
    return options
        .option("--k8s-namespace <namespace>", "Kubernetes namespace used in Sequence and Instance adapters.")
        .option("--k8s-quota-name <name>", "Quota object name used in Instance adapter.")
        .option("--k8s-auth-config-path <path>", "Kubernetes authorization config path. If not supplied the mounted service account will be used.")
        .option("--k8s-sth-pod-host <host>", "Runner needs to connect to STH. This is the host (IP or hostname) that it will try to connect to.")
        .option("--k8s-runner-image <image>", "Runner image spawned in Nodejs Pod.")
        .option("--k8s-runner-py-image <image>", "Runner image spawned in Python Pod.")
        .option("--k8s-sequences-root <path>", "Specifies a location where Kubernetes Process Adapter saves new Sequences. The support of this option will be deprecated in the near future. Please use the option '--sequences-root <path>' instead.")
        .option("--k8s-runner-cleanup-timeout <timeout>", "Set timeout for deleting runner Pod after failure in ms")
        .option("--k8s-runner-resources-requests-cpu <cpu_unit>", "Requests CPU for pod in cpu units [1 CPU unit is equivalent to 1 physical CPU core, or 1 virtual core]")
        .option("--k8s-runner-resources-requests-memory <memory>", "Requests memory for pod e.g [128974848, 129e6, 129M,  128974848000m, 123Mi]")
        .option("--k8s-runner-resources-limits-cpu <cpu unit>", "Set limits for CPU  [1 CPU unit is equivalent to 1 physical CPU core, or 1 virtual core]")
        .option("--k8s-runner-resources-limits-memory <memory>", "Set limits for memory e.g [128974848, 129e6, 129M,  128974848000m, 123Mi]")
        ;
}

export async function initialize(config: AdapterConfig) {
    if (!config.sthPodHost) {
        throw new Error("Kubernetes pod host url is not set in kubernetes.sthPodHost config.");
    }

    initializeImports();
}


export function augmentConfig(config: STHConfiguration) {
    config.adapters.kubernetes = {
        name: "kubernetes",
        sequencesRoot: config.sequencesRoot,
        ...config.kubernetes
    };

    return config;
}

export function augment() {
    return {
        initialize,
        augmentOptions,
        augmentConfig,
        SequenceAdapterClass: KubernetesSequenceAdapter,
        LifeCycleAdapterClass: KubernetesInstanceAdapter
    } as IAdapterAugmentation
}
