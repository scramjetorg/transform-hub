export type InstanceId = string;

export type InstanceArgs = any[];

export const enum InstanceStatus {
    INITIALIZING = "initializing",
    STARTING = "starting",
    RUNNING = "running",
    STOPPING = "stopping",
    KILLING = "killing",
    COMPLETED ="completed",
    ERRORED = "errored",
}
