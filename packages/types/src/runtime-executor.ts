import { ChildProcess } from "child_process";
import { Duplex, Readable } from "stream";
import type { RuntimeKind } from "@scramjet/symbols";
import { AppConfig } from "./app-config";
import { LogLevel } from "./object-logger";
import { SequenceInfo } from "./sequence-adapter";
export { selectRuntimeKind } from "@scramjet/symbols";
export type { RuntimeKind } from "@scramjet/symbols";

/**
 * Boot configuration passed to a runtime child process via a private JSON file.
 * Mirrors RunnerNodeBootConfig from runner-node/src/boot-config.ts.
 * Field naming matches start-runner.ts:86-97 writeBootConfig() payload.
 */
export interface BootConfig {
    /** Absolute path to the sequence entry module. */
    sequencePath: string;
    /** Stable instance id (UUID). */
    instanceId: string;
    /** Host instances-server port. */
    instancesServerPort: number;
    /** Host instances-server host/IP. */
    instancesServerHost: string;
    /** Sequence metadata. */
    sequenceInfo: SequenceInfo;
    /** Optional sequence args forwarded to the sequence function. */
    sequenceArgs?: unknown[];
    /** Sequence app config (migrated from RunnerConnectInfo.appConfig). */
    appConfig?: AppConfig;
    /** Optional instance name. */
    instanceName?: string;
    /** Initial logger log level. */
    logLevel?: LogLevel;
    /** Optional path prefix for exposed API handlers. */
    exposePath?: string;
    /** Optional bind host for the exposed API server. */
    exposeHost?: string;
    /**
     * Optional PYTHONPATH for Python sequences (moved from process adapter env injection).
     * Only relevant for `python3` runtime.
     */
    pythonPath?: string;
}

/** Options for spawning a runtime process. */
export interface SpawnOptions {
    /**
     * Runtime entry point path.
     * For Node: absolute path to the runner-node entry script.
     * For Python: ignored (production uses `-m runner_python`);
     * set to non-empty for test-only override (`python3 <runtimeEntry> <bootConfigPath>`).
     * For Bun: path to the runner-bun TypeScript entry.
     */
    runtimeEntry: string;
    /** Absolute path to the boot config JSON file. */
    bootConfigPath: string;
    /** Override the Node executable path (Node-only). */
    nodeExecPath?: string;
    /** Working directory for the child process. */
    cwd?: string;
    /** Environment variables for the child process. */
    env?: NodeJS.ProcessEnv;
}

/**
 * Python wrapper spawn options.
 * Mirrors {@link SpawnOptions} so the Python wrapper can share the canonical launch contract.
 */
export interface PythonSpawnOptions extends SpawnOptions {}

/**
 * Node wrapper spawn options.
 * Mirrors {@link SpawnOptions} so the Node wrapper can share the canonical launch contract.
 */
export interface NodeSpawnOptions extends SpawnOptions {}

/**
 * Bun wrapper spawn options.
 * Mirrors {@link SpawnOptions} so the Bun wrapper can share the canonical launch contract.
 */
export interface BunSpawnOptions extends SpawnOptions {}

/** Handles returned after spawning a runtime child process. */
export interface RuntimeProcessHandles {
    /** The child process instance. */
    child: ChildProcess;
    /** Child stdout (fd1) as readable stream. */
    stdout: Readable;
    /** Child stderr (fd2) as readable stream. */
    stderr: Readable;
    /** fd4 - raw duplex byte pipe for control frames. */
    control: Duplex;
    /** fd5 - raw duplex byte pipe for monitoring frames. */
    monitoring: Duplex;
}

/** Runtime executor interface. Exactly two members per design constraint. */
export interface RuntimeExecutor<T extends SpawnOptions = SpawnOptions> {
    /**
     * The runtime kind this executor produces.
     * See `docs/architecture/runner-runtime-wrappers.md` for the runtime-wrapper contract.
     */
    kind: RuntimeKind;
    /**
     * Spawn a runtime child process with the given options.
     * See `docs/architecture/runner-runtime-wrappers.md` for the runtime-wrapper contract.
     */
    spawn(opts: T): RuntimeProcessHandles;
}
