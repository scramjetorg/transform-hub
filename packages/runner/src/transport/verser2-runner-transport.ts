import http from "http";
import { PassThrough, Readable, Writable } from "stream";

import { CommunicationChannel as CC } from "@scramjet/symbols";
import { DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS } from "@scramjet/types";
import { createVerserNodeGuest } from "@signicode/verser2-guest-node";

import { LocalChannelServer } from "./local-channel-server";
import { RunnerTransportConfigVerser2, RunnerTransportConfigTls } from "./runner-transport-config";

export type RunnerVerser2Guest = {
    attach(server: http.Server, domain: string): RunnerVerser2Guest;
    connect(): Promise<void>;
    close(reason?: string): Promise<void>;
};

export type RunnerVerser2GuestFactoryOptions = {
    hostUrl: string;
    guestId: string;
    routedDomains: string[];
    minWaitingStreams?: number;
    leaseAcquireTimeoutMs?: number;
    tls?: RunnerTransportConfigTls;
};

export type RunnerVerser2GuestFactory = (options: RunnerVerser2GuestFactoryOptions) => RunnerVerser2Guest;

export type RunnerVerser2TransportStreams = {
    stdinStream: Readable;
    stdoutStream: Writable;
    stderrStream: Writable;
    controlStream: Readable;
    monitorStream: Writable;
};

export type RunnerVerser2TransportOptions = {
    config: RunnerTransportConfigVerser2;
    instanceId: string;
    createGuest?: RunnerVerser2GuestFactory;
};

const REQUEST_BODY_ROUTES = new Map<string, CC>([
    [DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.inputPath, CC.IN]
]);

const RESPONSE_BODY_ROUTES = new Map<string, CC>([
    [DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.outputPath, CC.OUT],
    [DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.logPath, CC.LOG]
]);

export class RunnerVerser2Transport implements RunnerVerser2TransportStreams {
    readonly stdinStream = new PassThrough({ emitClose: false });
    readonly stdoutStream = new PassThrough({ emitClose: false });
    readonly stderrStream = new PassThrough({ emitClose: false });
    readonly controlStream = new PassThrough({ emitClose: false });
    readonly monitorStream = new PassThrough({ emitClose: false });

    readonly server: http.Server;

    private readonly localChannels: LocalChannelServer;
    private guest?: RunnerVerser2Guest;
    private started = false;
    private readonly localChannelWaitMs: number;
    private rpcTarget?: { host: string; port: number };

    constructor(private readonly options: RunnerVerser2TransportOptions) {
        this.localChannels = new LocalChannelServer({ expectedInstanceId: options.instanceId });
        this.server = http.createServer((req, res) => this.handleRequest(req, res));
        this.localChannelWaitMs = Math.max(options.config.leaseAcquireTimeoutMs ?? 0, 60_000);
    }

    get localChannelPort(): number {
        return this.localChannels.port;
    }

    get localChannelHost(): string {
        return this.localChannels.address;
    }

    async init(): Promise<void> {
        if (this.started) {
            throw new Error("RunnerVerser2Transport already started");
        }

        try {
            await this.localChannels.start();

            const createGuest = this.options.createGuest ?? createVerserNodeGuest as RunnerVerser2GuestFactory;

            this.guest = createGuest({
                hostUrl: this.options.config.hostUrl,
                guestId: this.options.config.guestId,
                routedDomains: [this.options.config.routeDomain],
                minWaitingStreams: this.options.config.minWaitingStreams,
                leaseAcquireTimeoutMs: this.options.config.leaseAcquireTimeoutMs,
                tls: this.options.config.tls
            }).attach(this.server, this.options.config.routeDomain);

            await this.guest.connect();
            this.started = true;
        } catch (error) {
            await this.disconnect(true, "startup-failed").catch(() => undefined);
            throw error;
        }
    }

    async disconnect(hard: boolean, reason = hard ? "hard-disconnect" : "disconnect"): Promise<void> {
        for (const stream of [
            this.stdinStream,
            this.stdoutStream,
            this.stderrStream,
            this.controlStream,
            this.monitorStream
        ]) {
            if (hard) stream.destroy();
            else stream.end();
        }

        await this.localChannels.close();
        await this.guest?.close(reason).catch(() => undefined);
        this.guest = undefined;

        if (this.server.listening) {
            await new Promise<void>((resolve) => this.server.close(() => resolve()));
        }

        this.started = false;
    }

    setRpcTarget(host: string, port: number): void {
        this.rpcTarget = { host, port };
    }

    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        try {
            const path = req.url?.split("?")[0] || "/";

            if (req.method === "POST" && path === DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.stdinPath) {
                this.pipeRequest(req, res, this.stdinStream, true);
                return;
            }

            if (req.method === "POST" && path === DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.controlPath) {
                this.pipeRequest(req, res, this.controlStream, false);
                return;
            }

            if (req.method === "GET" && path === DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.stdoutPath) {
                this.pipeResponse(res, this.stdoutStream);
                return;
            }

            if (req.method === "GET" && path === DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.stderrPath) {
                this.pipeResponse(res, this.stderrStream);
                return;
            }

            if (req.method === "GET" && path === DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.monitoringPath) {
                this.pipeResponse(res, this.monitorStream);
                return;
            }

            const requestBodyChannel = REQUEST_BODY_ROUTES.get(path);

            if (req.method === "POST" && requestBodyChannel !== undefined) {
                const stream = await this.localChannels.waitForStream(requestBodyChannel, this.localChannelWaitMs);

                this.pipeRequest(req, res, stream, true);
                return;
            }

            const responseBodyChannel = RESPONSE_BODY_ROUTES.get(path);

            if (req.method === "GET" && responseBodyChannel !== undefined) {
                const stream = await this.localChannels.waitForStream(responseBodyChannel, this.localChannelWaitMs);

                this.pipeResponse(res, stream);
                return;
            }

            if (path === DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.requestsPath) {
                this.writeStatus(res, 501, "Runner requests route is reserved for runtime migration");
                return;
            }

            if (this.rpcTarget) {
                this.proxyRpcRequest(req, res, req.url || "/");
                return;
            }

            this.writeStatus(res, 503, "Runner RPC target is not ready");
        } catch (error) {
            this.writeStatus(res, 503, error instanceof Error ? error.message : String(error));
        }
    }

    private proxyRpcRequest(req: http.IncomingMessage, res: http.ServerResponse, path: string): void {
        const target = this.rpcTarget!;
        const proxyReq = http.request({
            host: target.host,
            port: target.port,
            method: req.method,
            path,
            headers: req.headers
        }, proxyRes => {
            res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on("error", error => {
            this.writeStatus(res, 503, error.message);
        });
        req.pipe(proxyReq);
    }

    private pipeRequest(req: http.IncomingMessage, res: http.ServerResponse, target: Writable, endTargetOnRequestEnd: boolean): void {
        this.writeStatus(res, 204);
        req.on("error", error => target.destroy(error));
        target.on("error", () => req.destroy());
        req.pipe(target, { end: endTargetOnRequestEnd });
        req.once("end", () => {
            if (!endTargetOnRequestEnd) {
                req.unpipe(target);
            }
        });
    }

    private pipeResponse(res: http.ServerResponse, source: Readable): void {
        res.writeHead(200, { "content-type": "application/octet-stream" });
        if (typeof res.flushHeaders === "function") {
            res.flushHeaders();
        } else {
            res.write("");
        }
        source.on("error", error => res.destroy(error));
        source.pipe(res);
        source.resume();
    }

    private writeStatus(res: http.ServerResponse, statusCode: number, message?: string): void {
        if (res.headersSent) {
            res.end();
            return;
        }

        res.statusCode = statusCode;
        res.end(message);
    }
}
