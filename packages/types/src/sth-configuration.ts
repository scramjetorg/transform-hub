export type ContainerConfiguration = {
    /**
     * Docker image to use.
     */
    image: string;
    /**
     * Maximum memory container can allocate (megabytes)
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

export type PreRunnerContainerConfiguration = ContainerConfiguration;
export type RunnerContainerConfiguration = ContainerConfiguration & ContainerConfigurationWithExposedPorts;

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
     * Socket name for connecting supervisors.
     */
    socketPath: string;

    /**
     * Host information filepath.
     */
    infoFilePath: string;
}

export type STHConfiguration = {
    cpmUrl: string;

    /**
     * Docker related configuration.
     */
    docker: {
        prerunner: PreRunnerContainerConfiguration,
        runner: RunnerContainerConfiguration,
    },

    /**
     * Host configuration.
     */
    host: HostConfig;

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
     * Should we identify existing sequences
     */
    identifyExisting: boolean;
}
