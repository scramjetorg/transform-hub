export type DiskSpace = {
    fs: string,
    size: number,
    used: number,
    available: number,
    use: number
}

export type LoadCheckStat = {

    avgLoad: number,

    currentLoad: number,

    memFree: number,

    memUsed: number,

    fsSize: DiskSpace[]
}


