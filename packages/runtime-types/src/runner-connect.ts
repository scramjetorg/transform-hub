/**
 * Runner connection info type.
 *
 * Simplified structural copy from the old types package/runner-connect.ts.
 */

import { LogLevel } from "./object-logger";

export type RunnerConnectInfo = {
    appConfig: any;
    args?: any[];
    outputTopic?: string;
    inputTopic?: string;
    limits?: any;
    writeDegraded?: boolean;
    instanceId?: string;
    instanceName?: string;
    exposePath?: string;
    exposeHost?: string;
    exposePort?: number;
    reconnect?: boolean;
    system?: Record<string, string>;
    logLevel?: LogLevel;
    /** Whether the runner should forward its log channel to the host. */
    forwardRunnerLogs?: boolean;
};
