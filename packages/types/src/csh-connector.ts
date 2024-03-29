import { IComponent } from "./component";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import { UpstreamStreamsConfig } from "./message-streams";
import { Agent } from "http";

export interface IHostClient extends IComponent {
    /**
     * Interface used by Runner to communicate with Host.
     */

    init(id: string): Promise<void>;

    /**
     * Disconnects from a host server.
     */
    disconnect(hard: boolean): Promise<void>;
    getAgent(): Agent;

    stdinStream: UpstreamStreamsConfig[CC.STDIN]

    stdoutStream: UpstreamStreamsConfig[CC.STDOUT]

    stderrStream: UpstreamStreamsConfig[CC.STDERR]

    controlStream: UpstreamStreamsConfig[CC.CONTROL]

    monitorStream: UpstreamStreamsConfig[CC.MONITORING]

    inputStream: UpstreamStreamsConfig[CC.IN]

    outputStream: UpstreamStreamsConfig[CC.OUT]

    logStream: UpstreamStreamsConfig[CC.LOG]

    packageStream: UpstreamStreamsConfig[CC.PACKAGE]
}
