export type GetHealthResponse = {
    cpuTotalUsage?: number; // docker specific
    healthy: boolean;
    /** Optional detailed health retained for v2-aware clients. */
    details?: Record<string, unknown>;
    limit?: number; // docker specific
    memoryMaxUsage?: number; // docker specific
    memoryUsage?: number; // docker specific
    networkRx?: number; // docker specific
    networkTx?: number; // docker specific
    containerId?: string; //docker specific
    processId?: number; // process specific
};
