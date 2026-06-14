import { BPMux } from "@scramjet/bpmux";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import {
    DownstreamStreamsConfig,
    HostProxy,
    ICommunicationHandler,
    LegacyRunnerTransportBpmuxFactory,
    LegacyRunnerTransportMultiplex,
    PassThroughStreamsConfig,
    RunnerTransport,
    RunnerTransportConnectOptions
} from "@scramjet/types";

export class LegacyRunnerTransport implements RunnerTransport {
    readonly kind = "legacy" as const;
    private streams?: DownstreamStreamsConfig;
    private multiplex?: LegacyRunnerTransportMultiplex;

    constructor(
        private readonly upstreams: PassThroughStreamsConfig,
        private readonly communicationHandler: ICommunicationHandler,
        private readonly hostProxy: HostProxy,
        private readonly createMultiplex: LegacyRunnerTransportBpmuxFactory = (stream) => new BPMux(stream) as LegacyRunnerTransportMultiplex
    ) {}

    async connect({ streams }: RunnerTransportConnectOptions): Promise<void> {
        this.streams = streams;
        this.communicationHandler.hookUpstreamStreams(this.upstreams);
        this.communicationHandler.hookDownstreamStreams(streams);
        this.communicationHandler.pipeStdio();
        this.communicationHandler.pipeMessageStreams();
        this.communicationHandler.pipeDataStreams();

        if (streams[CC.REQUESTS]) {
            this.multiplex = this.createMultiplex(streams[CC.REQUESTS]!);
            this.multiplex.on("error", (e: Error) => {
                streams[CC.REQUESTS]?.end();
            });
            this.multiplex.on("peer_multiplex", (socket) => this.hostProxy.onInstanceRequest(socket));
        }
    }

    async disconnect(): Promise<void> {
        this.multiplex?.removeAllListeners();
        this.multiplex = undefined;

        if (this.streams) {
            this.streams[CC.STDOUT].unpipe();
            this.streams[CC.STDERR].unpipe();
            this.streams[CC.OUT].unpipe();
        }

        this.upstreams[CC.STDOUT].unpipe();
        this.upstreams[CC.STDERR].unpipe();
        this.upstreams[CC.OUT].unpipe();

        this.streams = undefined;
    }
}

export class Verser2RunnerTransport implements RunnerTransport {
    readonly kind = "verser2" as const;

    async connect(_options: RunnerTransportConnectOptions): Promise<void> {
        throw new Error("Verser2RunnerTransport route-backed connect is defined by contract but not implemented yet");
    }

    async disconnect(_reason?: string): Promise<void> {
        // Route-backed runner transport has no legacy socket arrays to tear down yet.
    }
}
