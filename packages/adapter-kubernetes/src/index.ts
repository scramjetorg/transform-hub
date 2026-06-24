import { AdapterConfig, IAdapterAugmentation, RuntimeOptionRegistry, STHConfiguration } from "@scramjet/api-types";
import { KubernetesSequenceAdapter } from "./kubernetes-sequence-adapter";
import { KubernetesInstanceAdapter } from "./kubernetes-instance-adapter";
import { initializeImports } from "./kubernetes-client-adapter";

export function augmentOptions(options: RuntimeOptionRegistry): RuntimeOptionRegistry {
    return options
        .option({ name: "k8sNamespace", flag: "k8s-namespace", type: "string", description: "Kubernetes namespace used in Sequence and Instance adapters." })
        .option({ name: "k8sQuotaName", flag: "k8s-quota-name", type: "string", description: "Quota object name used in Instance adapter." })
        .option({ name: "k8sAuthConfigPath", flag: "k8s-auth-config-path", type: "string", description: "Kubernetes authorization config path. If not supplied the mounted service account will be used." })
        .option({ name: "k8sSthPodHost", flag: "k8s-sth-pod-host", type: "string", description: "Runner needs to connect to STH. This is the host (IP or hostname) that it will try to connect to (or :auto to attempt autodetection)." })
        .option({ name: "k8sDefaultPullPolicy", flag: "k8s-default-pull-policy", type: "string", description: "Default pull policy for the runner images. If not supplied, the default value is 'IfNotPresent'.", choices: ["IfNotPresent", "Always", "Never"] })
        .option({ name: "k8sRunnerImage", flag: "k8s-runner-image", type: "string", description: "Runner image spawned in Nodejs Pod." })
        .option({ name: "k8sRunnerPyImage", flag: "k8s-runner-py-image", type: "string", description: "Runner image spawned in Python Pod." })
        .option({ name: "k8sRunnerBunImage", flag: "k8s-runner-bun-image", type: "string", description: "Runner image spawned in Bun Pod." })
        .option({ name: "k8sSequencesRoot", flag: "k8s-sequences-root", type: "string", description: "Specifies a location where Kubernetes Process Adapter saves new Sequences. The support of this option will be deprecated in the near future. Please use the option '--sequences-root <path>' instead." })
        .option({ name: "k8sRunnerCleanupTimeout", flag: "k8s-runner-cleanup-timeout", type: "string", description: "Set timeout for deleting runner Pod after failure in ms" })
        .option({ name: "k8sRunnerResourcesRequestsCpu", flag: "k8s-runner-resources-requests-cpu", type: "string", description: "Requests CPU for pod in cpu units [1 CPU unit is equivalent to 1 physical CPU core, or 1 virtual core]" })
        .option({ name: "k8sRunnerResourcesRequestsMemory", flag: "k8s-runner-resources-requests-memory", type: "string", description: "Requests memory for pod e.g [128974848, 129e6, 129M,  128974848000m, 123Mi]" })
        .option({ name: "k8sRunnerResourcesLimitsCpu", flag: "k8s-runner-resources-limits-cpu", type: "string", description: "Set limits for CPU  [1 CPU unit is equivalent to 1 physical CPU core, or 1 virtual core]" })
        .option({ name: "k8sRunnerResourcesLimitsMemory", flag: "k8s-runner-resources-limits-memory", type: "string", description: "Set limits for memory e.g [128974848, 129e6, 129M,  128974848000m, 123Mi]" });
}

export async function initialize(config: AdapterConfig) {
    if (!config.sthPodHost) {
        throw new Error("Kubernetes pod host url is not set in kubernetes.sthPodHost config.");
    }

    await initializeImports();
}

export function augmentConfig(config: STHConfiguration) {
    config.adapters.kubernetes = {
        name: "kubernetes",
        defaultPullPolicy: config.kubernetes?.defaultPullPolicy || "IfNotPresent",
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
    } as IAdapterAugmentation;
}
