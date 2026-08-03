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
    freeMem: number;
    cpuLoad: number;
    freeSpace: number;
};

export type LoadCheckRequirements = {
    safeOperationLimit: number;
    fsPaths: string[];
    instanceRequirements: InstanceRequirements;
};

export type LoadCheckContstants = {
    SAFE_OPERATION_LIMIT: number;
    MIN_INSTANCE_REQUIREMENTS: {
        freeMem: number;
        cpuLoad: number;
        freeSpace: number;
    };
};
