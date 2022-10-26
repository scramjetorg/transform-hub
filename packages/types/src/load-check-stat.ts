export type DiskSpace = {
    fs: string,
    type?: string,
    size: number,
    used: number,
    available: number,
    use: number
    mount?: string
}

export type LoadCheckStat = {

    avgLoad: number,

    currentLoad: number,

    memFree: number,

    memUsed: number,

    fsSize: DiskSpace[]
}

export type InstanceRequirements = {
    /**
     * Free memory required to start Manager instance. In megabytes.
     */
    freeMem: number,
    /**
     * Required free CPU. In percentage.
     */
    cpuLoad: number,
    /**
     * Free disk space required to start instance. In megabytes.
     */
    freeSpace: number
}

export type LoadCheckRequirements = {
    /**
     * The amount of memory that must remain free.
     */
    safeOperationLimit: number;
    /**
     * Minimum requirements to start new Manager instance.
     */
    instanceRequirements: InstanceRequirements
}

export type LoadCheckContstants = {
    SAFE_OPERATION_LIMIT: number,
    MIN_INSTANCE_REQUIREMENTS: {
        freeMem: number,
        cpuLoad: number,
        freeSpace: number
    }
}

