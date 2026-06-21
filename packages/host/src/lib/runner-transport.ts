import type { RoutedForwardTransport } from "@scramjet/api-server";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import { Readable } from "stream";
import {
    DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS,
    ICommunicationHandler,
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
            let interval: ReturnType<typeof setInterval> | undefined;
            let timeout: ReturnType<typeof setTimeout> | undefined;
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

            interval = setInterval(check, 10);
            timeout = timeoutMs === undefined ? undefined : setTimeout(() => {
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
            const routes = broker.getRoutes().filter(candidate => candidate.domain === request.domain);
            const route = routes[0];

            if (!route) {
                throw new Error(`Runner route unavailable: ${request.domain}`);
            }

            if (routes.length > 1) {
                throw new Error(`Duplicate runner route advertised: ${request.domain}`);
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

export class Verser2RunnerTransport implements RunnerTransport {
    readonly kind = "verser2" as const;
    readonly routeContracts: RunnerTransportRouteContracts;
    private broker?: Verser2RunnerBroker;
    private upstreams?: PassThroughStreamsConfig;
    private communicationHandler?: ICommunicationHandler;
    private routeReadinessMs?: number;
    private responseBodies: Readable[] = [];
    private connected = false;
    private connecting = false;
    private setupError?: Error;
    private connectionGeneration = 0;
    private abortController?: AbortController;

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

        this.connecting = true;
        this.connected = false;
        this.setupError = undefined;
        this.abortController = new AbortController();
        const generation = ++this.connectionGeneration;

        try {
            await this.waitForRoute(domain, generation);
            this.assertCurrentGeneration(generation);

            const route = this.broker.getRoutes().find(candidate => candidate.domain === domain);

            if (!route) {
                throw new Error(`Runner route unavailable: ${domain}`);
            }

            await this.openRequestBodyRoute(route.targetId, this.routeContracts.stdinPath, options.streams[CC.STDIN] as unknown as Readable, generation);
            await this.openRequestBodyRoute(route.targetId, this.routeContracts.controlPath, options.streams[CC.CONTROL] as unknown as Readable, generation);
            await this.openRequestBodyRoute(route.targetId, this.routeContracts.inputPath, options.streams[CC.IN] as unknown as Readable, generation);
            await this.openResponseBodyRoute(domain, this.routeContracts.stdoutPath, options.streams[CC.STDOUT] as unknown as NodeJS.WritableStream, false, generation);
            this.throwIfSetupFailed();
            await this.openResponseBodyRoute(domain, this.routeContracts.stderrPath, options.streams[CC.STDERR] as unknown as NodeJS.WritableStream, false, generation);
            this.throwIfSetupFailed();
            await this.openResponseBodyRoute(domain, this.routeContracts.monitoringPath, options.streams[CC.MONITORING] as unknown as NodeJS.WritableStream, false, generation);
            this.throwIfSetupFailed();
            await this.openResponseBodyRoute(domain, this.routeContracts.outputPath, options.streams[CC.OUT] as unknown as NodeJS.WritableStream, false, generation);
            this.throwIfSetupFailed();
            await this.openResponseBodyRoute(domain, this.routeContracts.logPath, options.streams[CC.LOG] as unknown as NodeJS.WritableStream, false, generation);
            this.throwIfSetupFailed();
            this.assertCurrentGeneration(generation);

            this.connected = true;
            this.connecting = false;
            this.communicationHandler?.hookUpstreamStreams(this.upstreams);
            this.communicationHandler?.hookDownstreamStreams(options.streams);
            this.communicationHandler?.pipeStdio();
            this.communicationHandler?.pipeMessageStreams();
            this.communicationHandler?.pipeDataStreams();
        } catch (error) {
            this.connecting = false;
            await this.disconnect("connect failed");
            throw error;
        }
    }

    async disconnect(_reason?: string): Promise<void> {
        this.connectionGeneration++;
        this.abortController?.abort();
        this.abortController = undefined;
        this.connected = false;
        this.connecting = false;
        this.responseBodies.forEach(body => {
            body.unpipe();
            body.destroy();
        });
        this.responseBodies = [];
    }

    private async openRequestBodyRoute(targetId: string, path: string, body: Readable, generation: number): Promise<void> {
        this.assertCurrentGeneration(generation);
        const response = await this.requestRoute({
            targetId,
            method: "POST",
            path,
            headers: { "content-type": "application/octet-stream" },
            body,
            signal: this.abortController?.signal
        }, generation);

        if (!this.isCurrentGeneration(generation)) {
            response.body.destroy();
        }

        this.assertCurrentGeneration(generation);

        this.assertSuccessfulRouteResponse(response, path);

        response.body.resume();
        this.responseBodies.push(response.body);
    }

    private async openResponseBodyRoute(
        domain: string,
        path: string,
        target: NodeJS.WritableStream,
        waitForRoute = true,
        generation = this.connectionGeneration
    ): Promise<void> {
        if (waitForRoute) {
            await this.waitForRoute(domain, generation);
            this.assertCurrentGeneration(generation);
        }

        const route = this.broker!.getRoutes().find(candidate => candidate.domain === domain);

        if (!route) {
            throw new Error(`Runner route unavailable: ${domain}`);
        }

        const response = await this.requestRoute({
            targetId: route.targetId,
            method: "GET",
            path,
            signal: this.abortController?.signal
        }, generation);

        if (!this.isCurrentGeneration(generation)) {
            response.body.destroy();
        }

        this.assertCurrentGeneration(generation);

        this.assertSuccessfulRouteResponse(response, path);

        response.body.pipe(target, { end: false });
        this.responseBodies.push(response.body);
        this.replaceLeaseAfterUse(response.body, domain, path, target, generation);
    }

    private replaceLeaseAfterUse(body: Readable, domain: string, path: string, target: NodeJS.WritableStream, generation: number): void {
        let handled = false;
        const replace = (error?: Error) => {
            if (handled) return;
            handled = true;
            this.responseBodies = this.responseBodies.filter(candidate => candidate !== body);

            if (!this.connected || generation !== this.connectionGeneration) {
                if (this.connecting && this.setupError === undefined) {
                    this.setupError = error || new Error(`Runner route ${path} closed during setup`);
                }
                return;
            }

            this.openResponseBodyRoute(domain, path, target, true, generation).catch(() => {
                if (!this.connected || generation !== this.connectionGeneration) return;
                // A replacement lease can fail after the runner has already
                // completed and removed its route. The original body ending is
                // enough signal; do not turn route cleanup into an unhandled
                // stream error on Host-owned PassThroughs.
            });
        };

        body.once("end", () => replace());
        body.once("close", () => replace());
        body.once("error", error => replace(error));
    }

    private assertSuccessfulRouteResponse(response: Verser2RunnerBrokerResponse, path: string): void {
        if (response.statusCode === undefined || (response.statusCode >= 200 && response.statusCode < 300)) {
            return;
        }

        response.body.destroy();
        throw new Error(`Runner route ${path} returned unsuccessful status ${response.statusCode}`);
    }

    private throwIfSetupFailed(): void {
        if (this.setupError) {
            throw this.setupError;
        }
    }

    private assertCurrentGeneration(generation: number): void {
        if (!this.isCurrentGeneration(generation)) {
            throw new Error("Runner verser2 transport connection was cancelled");
        }
    }

    private isCurrentGeneration(generation: number): boolean {
        return generation === this.connectionGeneration;
    }

    private async waitForRoute(domain: string, generation: number): Promise<void> {
        await Promise.race([
            this.broker!.waitForRoute(domain, this.routeReadinessMs),
            this.abortPromise(generation)
        ]);
    }

    private async requestRoute(request: Verser2RunnerBrokerRequest, generation: number): Promise<Verser2RunnerBrokerResponse> {
        const requestPromise = this.broker!.request(request).then(response => {
            if (!this.isCurrentGeneration(generation)) {
                response.body.destroy();
            }

            this.assertCurrentGeneration(generation);
            return response;
        });

        return Promise.race([
            requestPromise,
            this.abortPromise(generation)
        ]);
    }

    private abortPromise(generation: number): Promise<never> {
        const signal = this.abortController?.signal;

        if (!signal) {
            return new Promise(() => undefined);
        }

        if (signal.aborted) {
            return Promise.reject(new Error("Runner verser2 transport connection was cancelled"));
        }

        return new Promise((_, reject) => {
            signal.addEventListener("abort", () => {
                reject(new Error("Runner verser2 transport connection was cancelled"));
            }, { once: true });
        }).finally(() => {
            this.assertCurrentGeneration(generation);
        }) as Promise<never>;
    }
}
