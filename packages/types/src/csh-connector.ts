import { MaybePromise } from "./utils";
import { IComponent } from "./component";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import { UpstreamStreamsConfig } from "./message-streams";

export interface IHostClient extends IComponent {
    /**
     * Interface used by Runner to communicate with Host.
     */

    init(id: string): MaybePromise<void>;

    /**
     * Disconnects from a host server.
     */
    disconnect(): Promise<void>;

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
