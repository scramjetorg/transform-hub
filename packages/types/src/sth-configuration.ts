import { MonitoringServerConfig } from "./monitoring-server";
import { LogLevel } from "./object-logger";
import { TelemetryConfig } from "./telemetry-config";

export type ContainerConfiguration = {
    /**
     * Docker image to use.
     */
    image: string;

    /**
     * Maximum memory container can allocate (megabytes).
     */
    maxMem: number;
}

export type ContainerConfigurationWithExposedPorts = {
    /**
     * Host IP address that the container's port is mapped to.
     */
    hostIp: string;

    /**
    * Host port number that the container's port is mapped to.
    */
    exposePortsRange: [number, number]
}

/**
 * PreRunner container configuration.
 */
export type PreRunnerContainerConfiguration = ContainerConfiguration;

/**
 * Runner container configuration.
 */
export type RunnerContainerConfiguration = ContainerConfiguration & ContainerConfigurationWithExposedPorts;

/**
 * Host process configuration.
 */
export type HostConfig = {
    /**
     * Hostname.
     */
    hostname: string;

    /**
     * Custom host identifier.
     */
    id?: string;

    /**
     * API port.
     */
    port: number;

    /**
     * API URL.
     */
    apiBase: string;

    /**
     * Port number for connecting Instances.
     */
    instancesServerPort: number;

    /**
     * Host information filepath.
     */
    infoFilePath: string;

    federationControl: boolean;
}

export type K8SAdapterConfiguration = {
    /**
     * The Kubernetes namespace to use for running sequences
     */
    namespace: string,

    /**
     * Quota object name to determine namespace limits.
     */
    quotaName?: string;

    /**
     * Authentication configuration path
     */
    authConfigPath?: string,
    /**
     * The host where to start STH Pods
     */
    sthPodHost: string,
    /**
     * Runner images to use
     */
    runnerImages: { python3: string, node: string },
    /**
     * Path to store sequences
     */
    sequencesRoot: string,
    timeout?: string,
    runnerResourcesRequestsMemory?: string,
    runnerResourcesRequestsCpu?: string,
    runnerResourcesLimitsMemory?: string,
    runnerResourcesLimitsCpu?: string
}

export type STHConfiguration = {
    /**
     * Description set by user
     */
    description?: string;

    /**
     * User assigned tags
     */
    tags?: Array<string>;

    /**
     * Custom name to help identify sth
     */
    customName?: string;

    /**
     * Logging level.
     */
    logLevel: LogLevel

    /**
     * Enable colors in logging.
     */
    logColors: boolean,

    /**
     * CPM url.
     */
    cpmUrl: string;

    /**
     * Path to the certificate authority file for verifying self-signed CPM certs
     */
    cpmSslCaPath?: string;

    /**
     * CPM id.
     */
    cpmId: string;

    cpm: {
        maxReconnections: number,
        reconnectionDelay: number
    };

    platform?: {
        apiKey: string;
        apiVersion: string;
        api: string;
        space: string;
        hostType: "hub" | "federation"
    };

    /**
     * Add debugging flags to runner.
     */
    debug: boolean;

    /**
     * Docker related configuration.
     */
    docker: {
        /**
         * PreRunner container configuration.
         */
        prerunner: PreRunnerContainerConfiguration,

        /**
         * Runner container configuration.
         */
        runner: RunnerContainerConfiguration,
        runnerImages: {
            python3: string,
            node: string,
        },
    },

    /**
     * Host configuration.
     */
    host: HostConfig;

    /**
     * Minimum requirements to start new Instance.
     */
    instanceRequirements: {
        /**
         * Free memory required to start Instance. In megabytes.
         */
        freeMem: number;

        /**
         * Required free CPU. In percentage.
         */
        cpuLoad: number;

        /**
         * Free disk space required to start Instance. In megabytes.
         */
        freeSpace: number;
    },

    /**
     * The amount of memory that must remain free. In megabytes.
     */
    safeOperationLimit: number;

    /**
     * Should we identify existing sequences.
     */
    identifyExisting: boolean;

    /**
     * Which sequence and instance adapters should STH use.
     * One of 'docker', 'process', 'kubernetes', 'detect'
     */
    runtimeAdapter: string,

    /**
     * Kubernetes adapter configuration
     */
    kubernetes: Partial<K8SAdapterConfiguration>,

    /**
     * Only used when `noDocker` is true
     * Where should ProcessSequenceAdapter save new Sequences
     */
    sequencesRoot: string,

    /**
     * Provides the location of a config file with the list of sequences
     * to be started along with the host
     */
    startupConfig: string,

    /**
     * Should the hub exit when the last instance ends
     */
    exitWithLastInstance: boolean,

    /**
     * Various timeout and interval configurations
     */
    timings: {
        /**
         * Heartbeat interval in miliseconds
         */
        heartBeatInterval: number,

        /**
         * Time to wait after Runner container exit.
         * In this additional time Instance API is still available.
         */
        instanceAdapterExitDelay: number;

        /**
         * Time to wait before CSIController emits `end` event.
         */
        instanceLifetimeExtensionDelay: number;
    };

    telemetry: TelemetryConfig;

    monitorgingServer?: MonitoringServerConfig;

    runnerEnvs?: Record<string, string>;
}

export type PublicSTHConfiguration = Omit<Omit<Omit<STHConfiguration, "sequencesRoot">, "cpmSslCaPath">, "kubernetes"> & {
    kubernetes: Omit<Omit<Partial<K8SAdapterConfiguration>, "authConfigPath">, "sequencesRoot">
};
