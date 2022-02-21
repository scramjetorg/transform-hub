export type GetHealthResponse = {
    cpuTotalUsage?: number; // docker specific
    healthy: boolean;
    limit?: number; // docker specific
    memoryMaxUsage?: number; // docker specific
    memoryUsage?: number; // docker specific
    networkRx?: number; // docker specific
    networkTx?: number; // docker specific
    containerId?: string; //docker specific
    processId?: number; // process specific
}
