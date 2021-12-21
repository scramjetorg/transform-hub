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

export type STHConfiguration = {
    /**
     * CPM url.
     */
    cpmUrl: string;

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
     * Whether host should run all the instances on the host machine,
     * instead of in docker containers
     * **UNSAFE FOR RUNNING ARBITRARY CODE (e.g. user submitted)**
     */
    noDocker: boolean;

    /**
     * Only used when `noDocker` is true
     * Where should ProcessSequenceAdapter save new sequences
     */
    sequencesRoot: string
}
