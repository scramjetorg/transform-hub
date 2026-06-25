/**
 * Provides basic function status information.
 */
export type FunctionStatus = {
    throughput: number;
    buffer: number;
    processing: number;
    readonly pressure: number;
};

export type RunnerOptions = {
    monitoringInterval?: number;
};
