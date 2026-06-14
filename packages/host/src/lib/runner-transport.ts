import { BPMux } from "@scramjet/bpmux";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import { Readable } from "stream";
import {
    DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS,
    DownstreamStreamsConfig,
    HostProxy,
    ICommunicationHandler,
    LegacyRunnerTransportBpmuxFactory,
    LegacyRunnerTransportMultiplex,
    PassThroughStreamsConfig,
    RunnerTransport,
    RunnerTransportConnectOptions,
    RunnerTransportRouteContracts
} from "@scramjet/types";

type Verser2RunnerRoute = {
    targetId: string;
    domain: string;
};

type Verser2RunnerBrokerRequest = {
    targetId: string;
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: Readable;
};

type Verser2RunnerBrokerResponse = {
    body: Readable;
};

export type Verser2RunnerBroker = {
    getRoutes(): Verser2RunnerRoute[];
    waitForRoute(domain: string): Promise<void>;
    request(request: Verser2RunnerBrokerRequest): Promise<Verser2RunnerBrokerResponse>;
};

export type Verser2RunnerTransportOptions = {
    broker?: Verser2RunnerBroker;
    upstreams?: PassThroughStreamsConfig;
    routeContracts?: RunnerTransportRouteContracts;
};

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
    readonly routeContracts: RunnerTransportRouteContracts;
    private broker?: Verser2RunnerBroker;
    private upstreams?: PassThroughStreamsConfig;
    private responseBodies: Readable[] = [];

    constructor(options: Verser2RunnerTransportOptions = {}) {
        this.broker = options.broker;
        this.upstreams = options.upstreams;
        this.routeContracts = options.routeContracts || DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS;
    }

    /**
     * Derives the runner domain for a given instance ID.
     * The domain follows the pattern: runner.<instanceId>.scramjet.internal
     */
    static getRouteDomain(instanceId: string): string {
        if (!instanceId) {
            throw new Error("Runner route domain requires a non-empty instanceId");
        }

        return `runner.${instanceId}.scramjet.internal`;
    }

    async connect(options: RunnerTransportConnectOptions): Promise<void> {
        if (!this.broker || !this.upstreams) {
            throw new Error("Verser2RunnerTransport requires broker and upstreams before connect");
        }

        const domain = Verser2RunnerTransport.getRouteDomain(options.instanceId);

        await this.broker.waitForRoute(domain);

        const route = this.broker.getRoutes().find(candidate => candidate.domain === domain);

        if (!route) {
            throw new Error(`Runner route unavailable: ${domain}`);
        }

        await Promise.all([
            this.openRequestBodyRoute(route.targetId, this.routeContracts.stdinPath, this.upstreams[CC.STDIN]),
            this.openRequestBodyRoute(route.targetId, this.routeContracts.controlPath, this.upstreams[CC.CONTROL]),
            this.openRequestBodyRoute(route.targetId, this.routeContracts.inputPath, this.upstreams[CC.IN]),
            this.openResponseBodyRoute(route.targetId, this.routeContracts.stdoutPath, this.upstreams[CC.STDOUT]),
            this.openResponseBodyRoute(route.targetId, this.routeContracts.stderrPath, this.upstreams[CC.STDERR]),
            this.openResponseBodyRoute(route.targetId, this.routeContracts.monitoringPath, this.upstreams[CC.MONITORING]),
            this.openResponseBodyRoute(route.targetId, this.routeContracts.outputPath, this.upstreams[CC.OUT]),
            this.openResponseBodyRoute(route.targetId, this.routeContracts.logPath, this.upstreams[CC.LOG])
        ]);
    }

    async disconnect(_reason?: string): Promise<void> {
        this.responseBodies.forEach(body => {
            body.unpipe();
            body.destroy();
        });
        this.responseBodies = [];
    }

    private async openRequestBodyRoute(targetId: string, path: string, body: Readable): Promise<void> {
        const response = await this.broker!.request({
            targetId,
            method: "POST",
            path,
            headers: { "content-type": "application/octet-stream" },
            body
        });

        response.body.resume();
        this.responseBodies.push(response.body);
    }

    private async openResponseBodyRoute(targetId: string, path: string, target: NodeJS.WritableStream): Promise<void> {
        const response = await this.broker!.request({
            targetId,
            method: "GET",
            path
        });

        response.body.pipe(target, { end: false });
        this.responseBodies.push(response.body);
    }
}
