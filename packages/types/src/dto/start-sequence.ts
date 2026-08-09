import { AppConfig } from "../app-config";
import { LogLevel } from "../object-logger";

export type StartSequenceDTO = {
    id: string,
    /**
     * Deprecated compatibility alias for instanceName only. Do not use as sequence name.
     * The validator will map this to instanceName when instanceName is absent.
     */
    name?: string,
    /** Logical sequence identifier (optional) */
    sequenceName?: string,
    /** Public instance label shown in responses (optional) */
    instanceName?: string,
    /** Whether this sequence is required on the target (optional) */
    required?: boolean,
    /** Non-negative integer restart limit for failed runs (optional) */
    restartLimit?: number,
    appConfig?: AppConfig,
    args?: string[],
    instanceId?: string;
    exposePath?: string;
    logLevel?: LogLevel;
    keepAlive?: boolean;
}

export type StartSequenceEndpointPayloadDTO = {
    appConfig?: AppConfig,
    instanceId?: string;
    /** Optional stable sequence selector used to confirm the targeted sequence */
    sequenceName?: string;
    /** Public instance label (optional) */
    instanceName?: string;
    args?: string[],
    logLevel?: LogLevel;
}
