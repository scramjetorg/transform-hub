import { AppError, AppErrorConstructor } from "./error-codes/app-error";
import { AppConfig } from "./app-config";
import { IObjectLogger } from "./object-logger";
import { MaybePromise } from "./utils";
import { ILocalStorage } from "./local-storage";
import { FunctionStatus } from "./runtime";
import { HealthPayload } from "./health";

// ---------------------------------------------------------------------------
// Minimal runtime-neutral types that were previously in the shared types
// package messages/describe-sequence.ts and messages/monitoring.ts.
// Owned here to keep BaseAppContext dependency-free from API/message packages.
// ---------------------------------------------------------------------------

/**
 * Stream mode and scalability definition for a single function.
 */
export type FunctionDefinition = {
    mode: "buffer" | "object" | "reference";
    name?: string;
    description?: string;
    scalability?: {
        head?: "CSP" | "CS" | "CP" | "SP" | "C" | "S" | "V" | "";
        tail?: "CSP" | "CS" | "CP" | "SP" | "C" | "S" | "V" | "";
    };
};

/**
 * Monitoring data received from the runner.
 */
export type MonitoringMessageFromRunnerData = {
    sequences?: FunctionStatus[];
    healthy: boolean;
    details?: HealthPayload["details"];
    error?: {
        stack?: string;
        message: string;
        code?: string;
    };
};

// ---------------------------------------------------------------------------
// Handler types
// ---------------------------------------------------------------------------

/**
 * A callback called when the Sequence is being stopped gracefully.
 */
export type StopHandler = (timeout: number, canCallKeepalive: boolean) => MaybePromise<void>;

export type KillHandler = () => void;

/**
 * A handler for the monitoring message.
 */
export type MonitoringHandler = (resp: MonitoringMessageFromRunnerData) => MaybePromise<MonitoringMessageFromRunnerData>;

// ---------------------------------------------------------------------------
// BaseAppContext — runtime-neutral minimum AppContext surface
// ---------------------------------------------------------------------------

/**
 * Generic runtime-neutral AppContext basis without API client dependencies.
 *
 * Does NOT include `hub`, `space`, or `api` members because those require
 * concrete API-client/HTTP types.  Those are added in stricter extensions
 * in the sequence-types and api-types companion packages.
 *
 * Generic type parameters:
 *   AppConfigType  — application configuration shape (extends AppConfig)
 *   State          — state type for save()/initialState
 *   HubClientType  — opaque hub client type (defaults to unknown)
 *   SpaceClientType — opaque space client type (defaults to unknown)
 */
export interface BaseAppContext<AppConfigType extends AppConfig, State extends any, HubClientType = unknown, SpaceClientType = unknown> {
    logger: IObjectLogger;

    addMonitoringHandler(handler: MonitoringHandler): this;
    addStopHandler(item: StopHandler): this;
    addKillHandler(handler: KillHandler): this;

    keepAlive(milliseconds?: number): this;
    end(): this;
    destroy(error?: AppError): this;

    save(state: State): this;
    initialState?: State;

    on(ev: string, handler: (message?: any) => void): this;
    on(ev: "error", handler: (message: Error) => void): this;

    emit(ev: string, message?: any): this;
    emit(ev: "error", message: AppError): this;

    emitToSpace(ev: string, message?: any): this;

    definition: FunctionDefinition;
    describe(definition: FunctionDefinition): this;

    readonly config: Partial<AppConfigType>;
    readonly AppError: AppErrorConstructor;
    exitTimeout: number;

    hubClient(): HubClientType;
    spaceClient(): SpaceClientType;

    instanceId: string;
    localStorage: ILocalStorage;
}
