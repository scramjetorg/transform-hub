import { BPMux } from "@scramjet/bpmux";
import type { RoutedForwardTransport } from "@scramjet/api-server";
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
    signal?: AbortSignal;
};

type Verser2RunnerBrokerResponse = {
    body: Readable;
    statusCode?: number;
    headers?: Record<string, string | string[] | number | undefined>;
};

export type Verser2RunnerBroker = {
    getRoutes(): Verser2RunnerRoute[];
    waitForRoute(domain: string, timeoutMs?: number): Promise<void>;
    request(request: Verser2RunnerBrokerRequest): Promise<Verser2RunnerBrokerResponse>;
};

export type Verser2RunnerBrokerLike = {
    getRoutes(): Verser2RunnerRoute[];
    request(request: Verser2RunnerBrokerRequest): Promise<Verser2RunnerBrokerResponse>;
};

export class Verser2RunnerRouteUnavailableError extends Error {
    constructor(domain: string, message = `Runner verser2 route is unavailable: ${domain}`) {
        super(message);
        this.name = "Verser2RunnerRouteUnavailableError";
    }
}

class PollingVerser2RunnerBroker implements Verser2RunnerBroker {
    constructor(private readonly broker: Verser2RunnerBrokerLike) {}

    getRoutes(): Verser2RunnerRoute[] {
        return this.broker.getRoutes();
    }

    request(request: Verser2RunnerBrokerRequest): Promise<Verser2RunnerBrokerResponse> {
        return this.broker.request(request);
    }

    async waitForRoute(domain: string, timeoutMs?: number): Promise<void> {
        if (this.getRoutes().some(route => route.domain === domain)) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            let finished = false;
            const finish = (error?: Error) => {
                if (finished) return;
                finished = true;
                clearInterval(interval);
                if (timeout) clearTimeout(timeout);
                if (error) reject(error);
                else resolve();
            };
            const check = () => {
                try {
                    if (this.getRoutes().some(route => route.domain === domain)) finish();
                } catch (error) {
                    finish(error instanceof Error ? error : new Error(String(error)));
                }
            };
            const interval = setInterval(check, 10);
            const timeout = timeoutMs === undefined ? undefined : setTimeout(() => {
                finish(new Verser2RunnerRouteUnavailableError(
                    domain,
                    `Timed out waiting for runner verser2 route: ${domain}`
                ));
            }, timeoutMs);

            check();
        });
    }
}

export function createVerser2RunnerBrokerTransport(broker: Verser2RunnerBrokerLike): Verser2RunnerBroker {
    return new PollingVerser2RunnerBroker(broker);
}

export function createRunnerBrokerRpcTransport(broker: Verser2RunnerBroker): RoutedForwardTransport {
    return {
        waitForRoute: (domain, timeoutMs) => broker.waitForRoute(domain, timeoutMs),
        request: async (request) => {
            const route = broker.getRoutes().find(candidate => candidate.domain === request.domain);

            if (!route) {
                throw new Error(`Runner route unavailable: ${request.domain}`);
            }

            const response = await broker.request({
                targetId: route.targetId,
                method: request.method,
                path: request.path,
                headers: request.headers,
                body: request.body,
                signal: request.signal
            });

            return {
                statusCode: response.statusCode || 200,
                headers: response.headers,
                body: response.body
            };
        }
    };
}

export type Verser2RunnerTransportOptions = {
    broker?: Verser2RunnerBroker;
    upstreams?: PassThroughStreamsConfig;
    communicationHandler?: ICommunicationHandler;
    routeReadinessMs?: number;
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
    private communicationHandler?: ICommunicationHandler;
    private routeReadinessMs?: number;
    private responseBodies: Readable[] = [];
    private connected = false;

    constructor(options: Verser2RunnerTransportOptions = {}) {
        this.broker = options.broker;
        this.upstreams = options.upstreams;
        this.communicationHandler = options.communicationHandler;
        this.routeReadinessMs = options.routeReadinessMs;
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

        this.communicationHandler?.hookUpstreamStreams(this.upstreams);
        this.communicationHandler?.hookDownstreamStreams(options.streams);
        this.communicationHandler?.pipeStdio();
        this.communicationHandler?.pipeMessageStreams();
        this.communicationHandler?.pipeDataStreams();

        await this.broker.waitForRoute(domain, this.routeReadinessMs);

        const route = this.broker.getRoutes().find(candidate => candidate.domain === domain);

        if (!route) {
            throw new Error(`Runner route unavailable: ${domain}`);
        }

        this.connected = true;

        await Promise.all([
            this.openRequestBodyRoute(route.targetId, this.routeContracts.stdinPath, options.streams[CC.STDIN] as unknown as Readable),
            this.openRequestBodyRoute(route.targetId, this.routeContracts.controlPath, options.streams[CC.CONTROL] as unknown as Readable),
            this.openRequestBodyRoute(route.targetId, this.routeContracts.inputPath, options.streams[CC.IN] as unknown as Readable),
            this.openResponseBodyRoute(domain, this.routeContracts.stdoutPath, options.streams[CC.STDOUT] as unknown as NodeJS.WritableStream, false),
            this.openResponseBodyRoute(domain, this.routeContracts.stderrPath, options.streams[CC.STDERR] as unknown as NodeJS.WritableStream, false),
            this.openResponseBodyRoute(domain, this.routeContracts.monitoringPath, options.streams[CC.MONITORING] as unknown as NodeJS.WritableStream, false),
            this.openResponseBodyRoute(domain, this.routeContracts.outputPath, options.streams[CC.OUT] as unknown as NodeJS.WritableStream, false),
            this.openResponseBodyRoute(domain, this.routeContracts.logPath, options.streams[CC.LOG] as unknown as NodeJS.WritableStream, false)
        ]);
    }

    async disconnect(_reason?: string): Promise<void> {
        this.connected = false;
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

    private async openResponseBodyRoute(
        domain: string,
        path: string,
        target: NodeJS.WritableStream,
        waitForRoute = true
    ): Promise<void> {
        if (waitForRoute) {
            await this.broker!.waitForRoute(domain, this.routeReadinessMs);
        }

        const route = this.broker!.getRoutes().find(candidate => candidate.domain === domain);

        if (!route) {
            throw new Error(`Runner route unavailable: ${domain}`);
        }

        const response = await this.broker!.request({
            targetId: route.targetId,
            method: "GET",
            path
        });

        response.body.pipe(target, { end: false });
        this.responseBodies.push(response.body);
        this.replaceLeaseAfterUse(response.body, domain, path, target);
    }

    private replaceLeaseAfterUse(body: Readable, domain: string, path: string, target: NodeJS.WritableStream): void {
        let handled = false;
        const replace = () => {
            if (handled) return;
            handled = true;
            this.responseBodies = this.responseBodies.filter(candidate => candidate !== body);

            if (!this.connected) return;

            void this.openResponseBodyRoute(domain, path, target).catch(replacementError => {
                if (!this.connected) return;
                this.destroyTarget(target, replacementError instanceof Error
                    ? replacementError
                    : new Error(String(replacementError))
                );
            });
        };

        body.once("end", () => replace());
        body.once("close", () => replace());
        body.once("error", () => replace());
    }

    private destroyTarget(target: NodeJS.WritableStream, error: Error): void {
        const destroy = (target as unknown as { destroy?: (error?: Error) => void }).destroy;

        if (typeof destroy === "function") {
            destroy.call(target, error);
        }
    }
}
