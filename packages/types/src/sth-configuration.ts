import { LogLevel } from "./object-logger";

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
 * PreRunner container configuraion.
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
     * Port number for connecting instances.
     */
    instancesServerPort: number;

    /**
     * Host information filepath.
     */
    infoFilePath: string;
}

export type K8SAdapterConfiguration = {
    namespace: string,
    authConfigPath?: string,
    sthPodHost: string,
    runnerImages: { python3: string, node: string },
    sequencesRoot: string,
    timeout?: string
}

export type STHConfiguration = {
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
     * Path to the certficate authority file for verifying self-signed CPM certs
     */
    cpmSslCaPath?: string;

    /**
     * CPM id.
     */
    cpmId: string;

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
     * Minimum requirements to start new instance.
     */
    instanceRequirements: {
        /**
         * Free memory required to start instance. In megabytes.
         */
        freeMem: number;

        /**
         * Required free CPU. In percentage.
         */
        cpuLoad: number;

        /**
         * Free disk space required to start instance. In megabytes.
         */
        freeSpace: number;
    },

    /**
     * The amount of memory that must remain free.
     */
    safeOperationLimit: number;

    /**
     * Should we identify existing sequences.
     */
    identifyExisting: boolean;

    /**
     * Time to wait after Runner container exit.
     * In this additional time instance API is still available.
     */
    instanceAdapterExitDelay: number;

    /**
     * Which sequence and instance adpaters should sth use.
     * One of 'docker', 'process', 'kubernetes'
     */
     runtimeAdapter: string,

    /**
     * Only used when `noDocker` is true
     * Where should ProcessSequenceAdapter save new sequences
     */
    sequencesRoot: string

    kubernetes: Partial<K8SAdapterConfiguration>
}

export type PublicSTHConfiguration = Omit<Omit<Omit<STHConfiguration, "sequencesRoot">, "cpmSslCaPath">, "kubernetes"> & {
    kubernetes: Omit<Omit<Partial<K8SAdapterConfiguration>, "authConfigPath">, "sequencesRoot">
};
