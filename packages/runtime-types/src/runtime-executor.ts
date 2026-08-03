/**
 * Runtime executor types: executor interface, spawn options, process handles.
 *
 * Simplified structural copy from the old types package/runtime-executor.ts.
 * ChildProcess is referenced loosely via "any" to avoid importing child_process
 * in a pure-type package.
 */

import { Readable, Duplex } from "stream";
import { SequenceInfo } from "./sequence-info";

import { LogLevel } from "./object-logger";

/**
 * Boot configuration passed to a runtime child process.
 */
export interface BootConfig {
    sequencePath: string;
    instanceId: string;
    instancesServerPort: number;
    instancesServerHost: string;
    sequenceInfo: SequenceInfo;
    sequenceArgs?: unknown[];
    appConfig?: any;
    instanceName?: string;
    logLevel?: LogLevel;
    exposePath?: string;
    exposeHost?: string;
    pythonPath?: string;
}

/**
 * Options for spawning a runtime process.
 */
export interface SpawnOptions {
    runtimeEntry: string;
    bootConfigPath: string;
    nodeExecPath?: string;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
}

/** Python wrapper spawn options. */
export interface PythonSpawnOptions extends SpawnOptions {}

/** Node wrapper spawn options. */
export interface NodeSpawnOptions extends SpawnOptions {}

/** Bun wrapper spawn options. */
export interface BunSpawnOptions extends SpawnOptions {}

/** Handles returned after spawning a runtime child process. */
export interface RuntimeProcessHandles {
    child: any; // ChildProcess
    stdout: Readable;
    stderr: Readable;
    control: Duplex;
    monitoring: Duplex;
}

/** Runtime executor interface. */
export interface RuntimeExecutor<T extends SpawnOptions = SpawnOptions> {
    kind: string;
    spawn(opts: T): RuntimeProcessHandles;
}
