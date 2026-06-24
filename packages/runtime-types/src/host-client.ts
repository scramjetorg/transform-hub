/**
 * IHostClient interface used by Runner to communicate with Host.
 *
 * Simplified structural copy from the old types package/csh-connector.ts.
 * References UpstreamStreamsConfig positions by numeric index.
 */

import { IObjectLogger } from "./object-logger";
import { UpstreamStreamsConfig } from "./message-streams";

export interface IHostClient {
    logger: IObjectLogger;
    init(id: string): Promise<void>;
    disconnect(hard: boolean): Promise<void>;
    getAgent(): any;

    stdinStream: UpstreamStreamsConfig[0];
    stdoutStream: UpstreamStreamsConfig[1];
    stderrStream: UpstreamStreamsConfig[2];
    controlStream: UpstreamStreamsConfig[3];
    monitorStream: UpstreamStreamsConfig[4];
    inputStream: UpstreamStreamsConfig[5];
    outputStream: UpstreamStreamsConfig[6];
    logStream: UpstreamStreamsConfig[7];
    requestsStream?: UpstreamStreamsConfig[8];
}
