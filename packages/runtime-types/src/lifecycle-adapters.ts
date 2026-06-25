/**
 * Lifecycle adapter interfaces.
 *
 * Simplified structural copies from the old types package/lifecycle-adapters.ts.
 * Uses loose types to avoid importing cycle-heavy types.
 */

export type ExitCode = number;

export interface ILifeCycleAdapterMain {
    logger: any;
    id?: string;
    init(): Promise<void>;
    cleanup(): Promise<void>;
    remove(): Promise<void>;
    monitorRate(rps: number): this;
    stats(msg: any): Promise<any>;
    getCrashLog(): Promise<string[]>;
    waitUntilExit(config: any, instanceId: string, sequenceInfo: any): Promise<ExitCode>;
}

export interface ILifeCycleAdapterRun extends ILifeCycleAdapterMain {
    limits: any;
    setRunner?(system: Record<string, string> | undefined): void | Promise<void>;
    dispatch(config: any, instancesServerPort: number, instanceId: string, sequenceInfo: any, payload: any): Promise<number>;
    run(config: any, instancesServerPort: number, instanceId: string, sequenceInfo: any, payload: any): Promise<ExitCode>;
}

export type LifeCycleError = any;
