import { RunnerError } from "@scramjet/model";
import { ObjLogger } from "@scramjet/obj-logger";
import { InstanceStatus, RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";
import { AppConfig, HasTopicInformation, IComponent, IObjectLogger, MaybePromise, Streamable, SynchronousStreamable } from "@scramjet/runtime-types";
import type { SequenceApplicationFunction, SequenceApplicationInterface } from "@scramjet/sequence-types";
import {
    EncodedControlMessage,
    EncodedMonitoringMessage,
    EventMessageData,
    HandshakeAcknowledgeMessageData,
    IHostClient,
    MonitoringRateMessageData,
    PangMessageData,
    RunnerConnectInfo,
    SequenceInfo,
    SetMessageData,
    StopSequenceMessageData,
    StorageMessageData,
    StorageUpdateMessageData
} from "@scramjet/runtime-types";
import { APIExpose } from "@scramjet/api-types";
import { defer, promiseTimeout } from "@scramjet/utility";

// Dual-client pattern: v1 HostClient is retained for legacy AppContext compatibility;
// v2 fluent clients are used for new Hub/Space client paths.
import { HostClient as HostApiClient } from "@scramjet/api-client";
import { ClientUtils, ClientUtilsCustomAgent } from "@scramjet/client-utils";
import { ApiClientTransport, createHubClient, createSpaceClient, HubClient, SpaceClient } from "@scramjet/rest-api2";

import { BufferStream, DataStream, StringStream } from "scramjet";

import { EventEmitter } from "events";
import { WriteStream, constants, createWriteStream, writeFileSync } from "fs";
import { Readable, Writable } from "stream";

import { RunnerAppContext, RunnerProxy } from "./runner-app-context";
import { mapToInputDataStream, readInputStreamHeaders, inputStreamInitLogger } from "./input-stream";
import { MessageUtils } from "./message-utils";
import { createServer } from "@scramjet/api-server";
import { AddressInfo } from "net";
import { LocalStorageAgent, LocalStorageAgentHost } from "./local-storage-agent";
import { setTimeout as setTimeoutPromise } from "timers/promises";
import { writeFile, unlink, access } from "fs/promises";

let exitHandled = false;

const TIMEOUT = Symbol("timeout");

function onBeforeExit(code: number) {
    if (exitHandled) return;

    const filepath = `/tmp/runner-${process.pid.toString()}`;

    writeFileSync(filepath, code.toString());

    exitHandled = true;
}

function onException(_error: Error) {
    console.error({ _error, stack: _error?.stack });
    process.exitCode = RunnerExitCode.UNCAUGHT_EXCEPTION;
    onBeforeExit(RunnerExitCode.UNCAUGHT_EXCEPTION);
    process.exit();
}

process.once("beforeExit", onBeforeExit);
process.once("uncaughtException", onException);
process.once("unhandledRejection", onException);

type MaybeArray<T> = T | T[];
type Primitives = string | number | boolean | void | null;
type OverrideConfig = {
    write: typeof Writable.prototype.write;
    drainCb: (...x: any[]) => void;
    errorCb: (...x: any[]) => void;
};
type RestApi2TransportRequest = Parameters<ApiClientTransport["request"]>[0];

function materializePath(path: string, params: unknown): string {
    if (!params || typeof params !== "object") {
        return path;
    }

    return Object.entries(params as Record<string, string>).reduce((current, [key, value]) => current.replace(`:${key}`, encodeURIComponent(String(value))), path);
}

function appendQuery(url: string, query: unknown): string {
    if (!query || typeof query !== "object") {
        return url;
    }

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
        if (value !== undefined) {
            params.set(key, String(value));
        }
    }

    const text = params.toString();

    return text ? `${url}?${text}` : url;
}

function responseHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};

    response.headers.forEach((value, key) => {
        headers[key] = value;
    });

    return headers;
}

/**
 * Wraps JSON parse errors from RestAPI2 v2 client flows with a clear,
 * actionable message.  Without this, route-metadata redirects (308) or
 * empty-body CPM proxy responses surface as a bare SyntaxError that is
 * indistinguishable from a genuine JSON bug.
 *
 * Only SyntaxErrors mentioning JSON parsing are caught; other errors
 * propagate unchanged.
 */
function normalizeRestApiResponseError(original: unknown, routePath: string, status?: number): Error {
    if (original instanceof SyntaxError && /JSON|parse|end of input|Unexpected/.test(original.message)) {
        const code = status !== undefined ? ` status=${status}` : "";
        return new Error(
            `RestAPI2 response parse error for ${routePath}${code}: ${original.message}. ` +
                `This may be caused by a 308 route-metadata redirect or an empty-body response ` +
                `from the Hub CPM proxy. Configure hubTargetDomain for direct Manager/space v2 ` +
                `routing, or handle route-aware responses explicitly.`
        );
    }

    return original instanceof Error ? original : new Error(String(original));
}

function createRestApi2Transport(clientUtils: ClientUtilsCustomAgent): ApiClientTransport {
    return {
        async request<T>(request: RestApi2TransportRequest) {
            const path = appendQuery(materializePath(request.route.fullPath, request.params), request.query).replace(/^\//, "");
            let response: Response;

            try {
                response = await clientUtils.request(request.route.method as any, path, {
                    headers: { ...request.headers },
                    body: request.body === undefined ? undefined : JSON.stringify(request.body)
                });
            } catch (err) {
                // Catches JSON parse errors from the verser-common/agent layer
                // before a Response object is formed (e.g. empty-body 308).
                throw normalizeRestApiResponseError(err, request.route.fullPath);
            }

            const text = await response.text();
            let body: T | undefined;

            if (text) {
                try {
                    body = JSON.parse(text) as T;
                } catch (err) {
                    throw normalizeRestApiResponseError(err, request.route.fullPath, response.status);
                }
            }

            return {
                status: response.status,
                headers: responseHeaders(response),
                body: body as T
            };
        }
    };
}

export function isSynchronousStreamable(obj: SynchronousStreamable<any> | Primitives): obj is SynchronousStreamable<any> {
    return !["string", "number", "boolean", "undefined", "null"].includes(typeof obj);
}

const overrideMap: Map<Writable, OverrideConfig> = new Map();

function revertStandardStream(oldStream: Writable) {
    if (overrideMap.has(oldStream)) {
        const { write, drainCb, errorCb } = overrideMap.get(oldStream) as OverrideConfig;

        delete (oldStream as Omit<Writable, "write"> & { write?: Writable["write"] }).write;

        // if prototypic write is there, then no change needed
        if (oldStream.write !== write) oldStream.write = write;

        oldStream.off("drain", drainCb);
        oldStream.off("error", errorCb);
        overrideMap.delete(oldStream);
    }
}

function overrideStandardStream(oldStream: Writable, newStream: Writable) {
    if (overrideMap.has(oldStream)) {
        //throw new Error("Attempt to override stream more than once");
        revertStandardStream(oldStream);
    }

    type WriteCallback = (error: Error | null | undefined) => void;
    type StandardWrite = (chunk: any, encoding?: BufferEncoding | WriteCallback, callback?: WriteCallback) => boolean;
    const write: StandardWrite = oldStream.write.bind(oldStream) as StandardWrite;
    const replacementWrite: StandardWrite = newStream.write.bind(newStream) as StandardWrite;

    if (process.env.PRINT_TO_STDOUT) {
        oldStream.write = (chunk: any, encoding?: BufferEncoding | ((error: Error | null | undefined) => void), callback?: (error: Error | null | undefined) => void) => {
            if (typeof encoding === "function") {
                write.call(oldStream, chunk, encoding);
                return replacementWrite(chunk, encoding);
            }

            if (encoding === undefined) {
                write.call(oldStream, chunk, callback);
                return replacementWrite(chunk, callback);
            }

            write.call(oldStream, chunk, encoding, callback);
            return replacementWrite(chunk, encoding, callback);
        };
    } else {
        oldStream.write = newStream.write.bind(newStream);
    }

    const drainCb = () => oldStream.emit("drain");
    const errorCb = (err: any) => oldStream.emit("error", err);

    newStream.on("drain", drainCb);
    newStream.on("error", errorCb);

    overrideMap.set(oldStream, { write, drainCb, errorCb });
}

type RunnerArgs = {
    sequencePath: string;
    hostClient: IHostClient;
    instanceId: string;
    connectInfo: SequenceInfo;
    runnerConnectInfo: RunnerConnectInfo;
};

/**
 * Runtime environment for sequence code.
 * Communicates with Host with data transferred to/from Sequence, health info,
 * reacts to control messages such as stopping etc.
 */
export class Runner<X extends AppConfig> implements IComponent {
    private localCache: Record<string, string | null> = {};
    private emitter;
    private _context?: RunnerAppContext<X, any, HubClient, SpaceClient>;
    private monitoringInterval?: NodeJS.Timeout;
    private keepAliveRequested?: boolean;

    private monitoringMessageReplyTimeout?: NodeJS.Timeout;
    private stopExpected: boolean = false;
    handshakeResolver?: { res: Function; rej: Function };

    logger: IObjectLogger;

    private inputDataStream: DataStream;
    private outputDataStream: DataStream;
    private sequenceInfo: SequenceInfo;

    private connected = false;
    private created = Date.now();

    private requires?: string;
    private requiresContentType?: string;
    private provides?: string;
    private providesContentType?: string;

    private inputContentType: string = "";
    private shouldSerialize = false;
    private status: InstanceStatus = InstanceStatus.STARTING;
    private logFile?: WriteStream;

    private runnerConnectInfo: RunnerConnectInfo = {
        appConfig: {}
    };

    instanceOutput?: (Readable & HasTopicInformation) | void;
    sequencePath: string;
    hostClient: IHostClient;
    instanceId: string;
    api: APIExpose;
    reconnect: boolean;
    shouldWriteDegraded: boolean;

    constructor({ sequencePath, hostClient, instanceId, connectInfo, runnerConnectInfo }: RunnerArgs) {
        this.sequencePath = sequencePath;
        this.hostClient = hostClient;
        this.instanceId = instanceId;
        this.sequenceInfo = connectInfo;
        this.emitter = new EventEmitter();
        this.reconnect = !!runnerConnectInfo.reconnect;
        this.shouldWriteDegraded = !!runnerConnectInfo.writeDegraded;

        this.api = createServer(undefined, {
            defaultRoute: (req, res) => {
                this.logger.debug("API unhandled request", req.url);

                res.writeHead(404);
                res.end("Not Found");
            }
        });

        this.runnerConnectInfo = runnerConnectInfo;

        this.logger = new ObjLogger(this, { id: instanceId }, runnerConnectInfo.logLevel || "DEBUG");

        hostClient.logger.pipe(this.logger);
        inputStreamInitLogger.pipe(this.logger);

        // if (process.env.PRINT_TO_STDOUT) {
        //     this.logger.addOutput(process.stdout);
        // }

        if (process.env.RUNNER_LOG_FILE) {
            this.logFile ||= createWriteStream(process.env.RUNNER_LOG_FILE);
            this.logFile.write("\n\n");
            this.logger.addOutput(this.logFile);
        }

        this.inputDataStream = new DataStream().catch((e: any) => {
            this.logger.error("Error during input data stream", e);

            throw e;
        });

        this.outputDataStream = new DataStream({ highWaterMark: 0 }).catch((e: any) => {
            this.logger.error("Error during output data stream", e);

            throw e;
        });
    }

    async onStorageMessage(data: { values: Record<string, string> }) {
        // this.logger.debug("Received local storage state from Host", data.values);  // <-- uncomment for debugging
        Object.keys(this.localCache).forEach((k) => delete this.localCache[k]);
        Object.assign(this.localCache, data.values);
    }

    async onStorageUpdateMessage(data: { key: string; value: string | null }) {
        (this.context.localStorage as any).handleBroadcastUpdate(data);
    }

    get context(): RunnerAppContext<X, any, HubClient, SpaceClient> {
        if (!this._context) {
            this.logger.error("Uninitialized context");

            throw new RunnerError("UNINITIALIZED_CONTEXT");
        }

        return this._context;
    }
    async controlStreamHandler([code, data]: EncodedControlMessage) {
        if (this.monitoringMessageReplyTimeout) {
            clearTimeout(this.monitoringMessageReplyTimeout);
        }

        switch (code) {
            case RunnerMessageCode.MONITORING_RATE:
                await this.handleMonitoringRequest(data as MonitoringRateMessageData);
                break;
            case RunnerMessageCode.KILL:
                await this.handleKillRequest();
                break;
            case RunnerMessageCode.STOP:
                await this.handleStopRequest(data as StopSequenceMessageData);
                break;
            case RunnerMessageCode.PONG:
                this.handlePongRequest(data as HandshakeAcknowledgeMessageData);
                break;
            case RunnerMessageCode.EVENT: {
                const eventData = data as EventMessageData;

                this.emitter.emit(eventData.eventName, eventData.message);
                break;
            }
            case RunnerMessageCode.MONITORING_REPLY:
                break;
            case RunnerMessageCode.STORAGE:
                await this.onStorageMessage(data as StorageMessageData);
                break;
            case RunnerMessageCode.STORAGE_UPDATE:
                await this.onStorageUpdateMessage(data as StorageUpdateMessageData);
                break;
            default:
                break;
        }
    }

    private handlePongRequest(data: HandshakeAcknowledgeMessageData) {
        this.handshakeResolver?.res(data);
        this.handleSetRequest(data);
    }

    private handleSetRequest(data: SetMessageData) {
        if (data.logLevel) {
            this.logger.logLevel = data.logLevel;

            if (this._context) this._context.logger.logLevel = data.logLevel;
        }
    }

    defineControlStream() {
        StringStream.from(this.hostClient.controlStream)
            .JSONParse()
            .each(async ([code, data]: EncodedControlMessage) => this.controlStreamHandler([code, data]))
            .on("error", (error) => {
                this.logger.error("Error parsing control message", error);
            });
    }

    async setInputContentType(headers: any) {
        this.inputContentType ||= headers["content-type"];

        this.logger.debug("Content-Type", this.inputContentType);

        mapToInputDataStream(this.hostClient.inputStream, this.inputContentType)
            .catch((error: any) => {
                this.logger.error("mapToInputDataStream", error);
                // TODO: we should be doing some error handling here:
                // TODO: remove the stream, mark as bad, kill the instance maybe?
            })
            .pipe(this.inputDataStream);
    }

    async handleMonitoringRequest(data: MonitoringRateMessageData): Promise<void> {
        this.logger.debug("handleMonitoringRequest");

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        let working = false;

        this.monitoringInterval = setInterval(async () => {
            if (working) {
                return;
            }

            working = true;
            await this.reportHealth(5_000);
            working = false;
        }, data.monitoringRate).unref();
    }

    private async wasDegraded(): Promise<boolean> {
        try {
            await access("/tmp/degraded", constants.R_OK);
            return true;
        } catch {
            return false;
        }
    }

    private async writeDegraded(degraded: boolean) {
        if (!this.shouldWriteDegraded) {
            return;
        }

        try {
            const wasDegraded = await this.wasDegraded();

            if (wasDegraded === degraded) {
                return;
            }

            if (degraded) {
                await unlink("/tmp/degraded").catch(() => {});
            } else {
                await writeFile("/tmp/degraded", "true");
            }
        } catch (e: any) {
            this.logger.error("Error while writing degraded message", e);
        }
    }

    private async reportHealth(timeout?: number): Promise<void> {
        // this.logger.info("Report health");

        let healthy = false;

        try {
            const message = timeout ? await promiseTimeout(this.context.monitor(), timeout, TIMEOUT) : await this.context.monitor();

            MessageUtils.writeMessageOnStream([RunnerMessageCode.MONITORING, message], this.hostClient.monitorStream);

            healthy = message.healthy;
        } catch (e: any) {
            if (e === TIMEOUT) {
                this.logger.error("Timeout while waiting for monitoring message reply");

                MessageUtils.writeMessageOnStream(
                    [
                        RunnerMessageCode.MONITORING,
                        {
                            healthy: false,
                            error: {
                                code: "E_TIMEOUT",
                                message: "Timeout while waiting for monitoring message reply"
                            }
                        }
                    ],
                    this.hostClient.monitorStream
                );
            } else if (e.message) {
                this.logger.error("Error while waiting for monitoring message reply", e.message);

                MessageUtils.writeMessageOnStream(
                    [
                        RunnerMessageCode.MONITORING,
                        {
                            healthy: false,
                            error: {
                                code: `${e.code || "E_UNKNOWN"}`,
                                message: `${e.message}`.slice(0, 256),
                                stack: e.stack ? `${e.stack}`.slice(0, 4096) : undefined
                            }
                        }
                    ],
                    this.hostClient.monitorStream
                );
            } else {
                this.logger.error("Error while waiting for monitoring message reply", e);

                MessageUtils.writeMessageOnStream([RunnerMessageCode.MONITORING, { healthy: false }], this.hostClient.monitorStream);
            }

            healthy = false;
        }

        this.writeDegraded(healthy).catch(() => {});
    }

    async handleDisconnect() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        if (this.monitoringMessageReplyTimeout) {
            clearTimeout(this.monitoringMessageReplyTimeout);
        }

        this.connected = false;

        try {
            await this.hostClient.disconnect(!this.connected);
            await defer(10000);
        } catch {
            this.logger.error("Disconnect failed");
        }

        if (!this.reconnect) {
            await Promise.all([
                new Promise<void>((res) => {
                    this.api.server.close(() => {
                        this.logger.debug("API server closed");
                        res();
                    });
                })
            ]);

            return this.exit(RunnerExitCode.DISCONNECTED);
        }

        this.logger.info("Reinitializing....");

        await this.premain();

        if (this.requires) {
            this.sendPang({ requires: this.requires, contentType: this.requiresContentType });
        }

        if (this.provides) {
            this.sendPang({ provides: this.provides, contentType: this.providesContentType });
        }

        return Promise.resolve();
    }

    async handleKillRequest(): Promise<void> {
        this.logger.debug("Handling KILL request");

        this.context.killHandler();

        if (!this.stopExpected) {
            this.logger.warn(`Exiting (unexpected, ${RunnerExitCode.KILLED})`);
            this.status = InstanceStatus.KILLING;

            return this.exit(RunnerExitCode.KILLED);
        }

        this.logger.info("Exiting (expected)");
        this.status = InstanceStatus.STOPPING;

        return this.exit(RunnerExitCode.STOPPED);
    }

    async handleStopRequest(data: StopSequenceMessageData): Promise<void> {
        this.keepAliveRequested = false;

        let sequenceError;

        try {
            await this.context.stopHandler(data.timeout, data.canCallKeepalive);
        } catch (err: any) {
            sequenceError = err;

            this.logger.error("Error stopping Sequence", err);
        }

        if (!data.canCallKeepalive || !this.keepAliveRequested) {
            this.status = InstanceStatus.STOPPING;

            MessageUtils.writeMessageOnStream([RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError }], this.hostClient.monitorStream);
        }

        this.stopExpected = true;
    }

    private keepAliveIssued(): void {
        this.keepAliveRequested = true;
    }

    private async exit(exitCode?: number) {
        await defer(200);

        this.cleanup()
            .then(
                (code) => {
                    process.exitCode = exitCode || code;
                },
                (e) => console.error(e?.stack)
            )
            .finally(() => {
                if (typeof process.exitCode === "number") onBeforeExit(process.exitCode);

                process.exit();
            });
    }

    async premain(): Promise<{ appConfig: AppConfig; args: any }> {
        this.logger.debug("premain");

        try {
            this.logger.debug("connecting...");
            await promiseTimeout(this.hostClient.init(this.instanceId), 10_000);
            this.logger.debug("connected");
            this.connected = true;

            await this.handleMonitoringRequest({ monitoringRate: 10000 });
        } catch (e) {
            this.connected = false;
            this.logger.warn("Can't connect to Host", e);

            await defer(10_000);

            return await this.premain();
        }

        this.logger.debug("Redirecting outputs");
        this.setupOutputs();

        this.logger.debug("Defining control stream");
        this.defineControlStream();

        if (this.inputContentType) {
            await this.setInputContentType({ headers: { "content-type": this.inputContentType } });
        }

        this.hostClient.stdinStream.on("data", (chunk: Buffer) => process.stdin.unshift(chunk)).on("end", () => process.stdin.emit("end"));

        process.stdin.on("pause", () => this.hostClient.stdinStream.pause());
        process.stdin.on("resume", () => this.hostClient.stdinStream.resume());

        this.logger.debug("Streams initialized");

        const { args, appConfig, exposePath, exposeHost } = {
            exposeHost: process.env.EXPOSE_HOST,
            ...this.runnerConnectInfo
        };

        if (exposePath && !this.api.server.listening) {
            this.logger.debug("Starting API server", { exposePath, exposeHost, envHost: process.env.EXPOSE_HOST });

            const [exposedPort, exposedHost] = await new Promise<[number, string]>((res) => {
                this.api.server.listen(0, exposeHost || "localhost", () => {
                    const address = this.api.server.address() as AddressInfo;
                    const port = address.port;
                    const host = address.address;

                    this.logger.debug("API server started", [port, host]);
                    res([port, host]);
                });
            });

            this.runnerConnectInfo.exposePort = exposedPort;
            this.runnerConnectInfo.exposeHost = exposedHost;
        }

        this.sendHandshakeMessage();

        return { appConfig, args };
    }

    sendPang(args: PangMessageData) {
        MessageUtils.writeMessageOnStream([RunnerMessageCode.PANG, args], this.hostClient.monitorStream);
    }

    async main() {
        const { appConfig, args } = await this.premain();

        this.initAppContext(appConfig as X);

        await this.reportHealth();
        await this.handleMonitoringRequest({ monitoringRate: 10000 });

        let sequence: any[] = [];

        try {
            sequence = this.getSequence();

            if (sequence.length && typeof sequence[0] !== "function") {
                this.logger.debug("First Sequence object is not a function:", sequence[0]);

                this.requires = sequence[0].requires;
                this.requiresContentType = sequence[0].contentType;

                this.sendPang({ requires: this.requires, contentType: this.requiresContentType });

                this.logger.trace("Waiting for input stream");

                await this.setInputContentType({
                    "content-type": sequence[0].contentType
                });

                sequence.shift();
            } else {
                MessageUtils.writeMessageOnStream(
                    [
                        RunnerMessageCode.PANG,
                        {
                            requires: ""
                        }
                    ],
                    this.hostClient.monitorStream
                );

                readInputStreamHeaders(this.hostClient.inputStream)
                    .then((headers) => this.setInputContentType(headers))
                    .catch((err) => {
                        this.logger.error("Error while reading input stream headers:", err);
                    });
            }

            this.logger.info("Sequence loaded, functions count", sequence.length);
        } catch (error: any) {
            if (error instanceof SyntaxError) {
                this.logger.error("Sequence syntax error.", error.stack);
            } else {
                this.logger.error("Sequence error:", error.stack);
            }

            this.status = InstanceStatus.ERRORED;

            await setTimeoutPromise(10000);

            return this.exit(RunnerExitCode.SEQUENCE_FAILED_ON_START);
        }

        try {
            await this.runSequence(sequence, args);

            this.logger.trace(`Sequence completed. Waiting ${this.context.exitTimeout}ms with exit.`);

            this.status = InstanceStatus.COMPLETED;
            this.writeMonitoringMessage([RunnerMessageCode.SEQUENCE_COMPLETED, { timeout: this.context.exitTimeout }]);

            await defer(this.context.exitTimeout);

            return this.exit(0);
        } catch (error: any) {
            this.logger.error("Error occurred during Sequence execution: ", error.stack);

            this.status = InstanceStatus.ERRORED;

            return this.exit(RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION);
        }
    }

    async cleanup(): Promise<number> {
        this.logger.info("Cleaning up");

        await this.revertOutputs();

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.logger.trace("Monitoring interval removed");
        }

        if (this.monitoringMessageReplyTimeout) {
            clearTimeout(this.monitoringMessageReplyTimeout);
            this.logger.trace("Monitoring reply check removed");
        }

        let exitcode = 0;

        try {
            this.logger.info("Cleaning up streams");
        } catch {
            this.status = InstanceStatus.ERRORED;

            exitcode = RunnerExitCode.CLEANUP_FAILED;
        }

        return exitcode;
    }

    private async revertOutputs() {
        this.logger.unpipe(this.hostClient.logStream);

        revertStandardStream(process.stdout);
        revertStandardStream(process.stderr);

        this.logger.addOutput(process.stderr);
    }

    private setupOutputs() {
        this.logger.pipe(this.hostClient.logStream, { stringified: true });

        if (!this.shouldSerialize) {
            this.instanceOutput?.pipe(this.hostClient.outputStream);
        }

        this.outputDataStream.JSONStringify().pipe(this.hostClient.outputStream);

        if (process.env.PRINT_TO_STDOUT && this.logFile) {
            process.stdout.pipe(this.logFile!);
            process.stderr.pipe(this.logFile!);
        }

        overrideStandardStream(process.stdout, this.hostClient.stdoutStream);
        overrideStandardStream(process.stderr, this.hostClient.stderrStream);
    }

    /**
     * initialize app context
     * set up streams process.stdin, process.stdout, process.stderr, fifo downstream, fifo upstream
     *
     * @param config Configuration for App.
     */
    initAppContext(config: X) {
        const hostClientUtils: ClientUtils = new ClientUtilsCustomAgent("http://scramjet-host/api/v1", this.hostClient.getAgent());
        const hostApiClient = new HostApiClient("http://scramjet-host/api/v1", hostClientUtils);

        const localStorageHost: LocalStorageAgentHost = {
            localCache: this.localCache,
            writeMonitoringMessage: (msg: EncodedMonitoringMessage) => {
                this.writeMonitoringMessage(msg);
            }
        };

        const localStorageAgent = new LocalStorageAgent(localStorageHost);

        const managerApiClient = hostApiClient.getManagerClient("/api/v1");
        const hubTargetDomain = process.env.HUB_TARGET_DOMAIN;
        const hubApiBase = hubTargetDomain ? `http://${hubTargetDomain}` : "http://scramjet-host";
        const restApi2Transport = createRestApi2Transport(new ClientUtilsCustomAgent(hubApiBase, this.hostClient.getAgent()));
        const v2HubClient = createHubClient({ transport: restApi2Transport, basePath: "/api/v2" });

        // Space v2 client: direct Manager/space routing when SPACE_TARGET_DOMAIN
        // env is available, otherwise Hub-local v2 fallback.
        const spaceTargetDomain = process.env.SPACE_TARGET_DOMAIN;
        const v2SpaceClient = spaceTargetDomain
            ? createSpaceClient({
                  transport: createRestApi2Transport(new ClientUtilsCustomAgent(`http://${spaceTargetDomain}`, this.hostClient.getAgent())),
                  basePath: "/api/v2"
              })
            : createSpaceClient({ transport: restApi2Transport, basePath: "/api/v2" });

        const runner: RunnerProxy = {
            keepAliveIssued: () => this.keepAliveIssued(),
            sendStop: (err?: Error) => {
                this.writeMonitoringMessage([RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError: err }]);
            },
            sendKeepAlive: (ev) => this.writeMonitoringMessage([RunnerMessageCode.ALIVE, ev]),
            sendEvent: (ev) => this.writeMonitoringMessage([RunnerMessageCode.EVENT, ev])
        };

        this._context = new RunnerAppContext(
            config,
            this.hostClient.monitorStream,
            this.emitter,
            runner,
            hostApiClient,
            managerApiClient,
            v2HubClient,
            v2SpaceClient,
            this.instanceId,
            this.logger.logLevel,
            this.api,
            localStorageAgent
        );
        this._context.logger.pipe(this.logger);

        this.handleSequenceEvents();
    }

    private writeMonitoringMessage(encodedMonitoringMessage: EncodedMonitoringMessage) {
        MessageUtils.writeMessageOnStream(encodedMonitoringMessage, this.hostClient.monitorStream);
        // TODO: what if it fails?
    }

    sendHandshakeMessage() {
        // TODO: send connection info
        MessageUtils.writeMessageOnStream(
            [
                RunnerMessageCode.PING,
                {
                    id: this.instanceId,
                    sequenceInfo: this.sequenceInfo,
                    created: this.created,
                    payload: {
                        ...this.runnerConnectInfo,
                        system: {
                            processPID: process.pid.toString()
                        }
                    },
                    status: this.status,
                    inputHeadersSent: !!this.inputContentType
                }
            ],
            this.hostClient.monitorStream
        );

        this.logger.trace("Handshake sent");
    }

    async waitForHandshakeResponse(): Promise<HandshakeAcknowledgeMessageData> {
        return new Promise<HandshakeAcknowledgeMessageData>((res, rej) => {
            this.handshakeResolver = { res, rej };
        });
    }

    getSequence(): SequenceApplicationInterface[] {
        const sequenceFromFile = require(this.sequencePath);
        const _sequence: MaybeArray<SequenceApplicationFunction> = Object.prototype.hasOwnProperty.call(sequenceFromFile, "default") ? sequenceFromFile.default : sequenceFromFile;

        const sequenceArr = Array.isArray(_sequence) ? _sequence : [_sequence];

        if (!sequenceArr.length) {
            throw new Error("Empty Sequence");
        }

        return sequenceArr;
    }

    async runSequence(sequence: any[], args: any[] = []): Promise<void> {
        /**
         * @analyze-how-to-pass-in-out-streams
         * Output stream will be returned from the Sequence:
         * await const outputStream = sequence.call(..);
         * This outputStreams needs to be piped to the
         * local Runner property outputStream (named fifo pipe).
         *
         * Pass the input stream to stream instead of creating new DataStream();
         */
        this.instanceOutput = this.inputDataStream;
        let itemsLeftInSequence = sequence.length;
        let intermediate: SynchronousStreamable<any> | void = this.instanceOutput;

        for (const func of sequence) {
            itemsLeftInSequence--;

            let out: MaybePromise<Streamable<any> | void>;

            try {
                this.logger.debug("Processing function on index", sequence.length - itemsLeftInSequence - 1);

                this.status = InstanceStatus.RUNNING;

                out = func.call(this.context, this.instanceOutput, ...args);

                this.logger.debug("Function called", sequence.length - itemsLeftInSequence - 1);
            } catch (error: any) {
                this.logger.error("Function errored", sequence.length - itemsLeftInSequence, error.stack);

                this.status = InstanceStatus.ERRORED;

                throw new RunnerError("SEQUENCE_RUNTIME_ERROR");
            }

            if (itemsLeftInSequence > 0) {
                intermediate = await out;

                this.logger.info("Function output type", sequence.length - itemsLeftInSequence - 1, typeof out);

                if (!intermediate) {
                    this.logger.error("Sequence ended premature");

                    this.status = InstanceStatus.ERRORED;

                    throw new RunnerError("SEQUENCE_ENDED_PREMATURE");
                } else if (typeof intermediate === "object" && intermediate instanceof DataStream) {
                    this.logger.debug("Sequence function returned DataStream.", sequence.length - itemsLeftInSequence - 1);

                    this.instanceOutput = intermediate;
                } else {
                    this.logger.debug("Sequence function returned readable", sequence.length - itemsLeftInSequence - 1);
                    // TODO: what if this is not a DataStream, but BufferStream stream!!!!
                    this.instanceOutput = DataStream.from(intermediate as Readable);
                }
            } else {
                this.logger.info("All Sequences processed.");

                intermediate = await out;

                if (intermediate instanceof Readable) {
                    this.instanceOutput = intermediate;
                } else if (intermediate !== undefined && isSynchronousStreamable(intermediate)) {
                    this.instanceOutput = Object.assign(DataStream.from(intermediate as Readable, { highWaterMark: 0 }), {
                        topic: intermediate.topic,
                        contentType: intermediate.contentType
                    });
                } else {
                    this.instanceOutput = undefined;
                }

                this.logger.debug("Stream type is", typeof this.instanceOutput);
            }
        }

        await new Promise<void>((res, rej) => {
            /**
             * @analyze-how-to-pass-in-out-streams
             * We need to make sure to close input and output streams
             * after Sequence terminates.
             *
             * pipe the last `stream` value to output stream
             * unless there is NO LAST STREAM
             */
            if (!isSynchronousStreamable(intermediate)) {
                this.logger.info("Primitive returned as last value");

                this.hostClient.outputStream.end(`${intermediate}`);

                this.sendPang({ provides: "", contentType: "" });

                res();
            } else if (this.instanceOutput && this.hostClient.outputStream) {
                this.logger.info("Piping Sequence output", typeof this.instanceOutput);

                this.shouldSerialize =
                    (this.instanceOutput.contentType && ["application/x-ndjson", "text/x-ndjson"].includes(this.instanceOutput.contentType)) ||
                    (this.instanceOutput instanceof DataStream && !(this.instanceOutput instanceof StringStream || this.instanceOutput instanceof BufferStream));

                if (!this.shouldSerialize && this.instanceOutput.readableEncoding) {
                    this.hostClient.outputStream.setDefaultEncoding(this.instanceOutput.readableEncoding);
                }

                this.logger.info("Will Output be serialized?", this.shouldSerialize);
                this.logger.info("Stream encoding is", this.instanceOutput.readableEncoding);

                this.instanceOutput
                    .on("error", (e) => {
                        this.logger.error("Sequence output stream error", e);
                        this.status = InstanceStatus.ERRORED;

                        rej(new RunnerError("SEQUENCE_RUNTIME_ERROR", e));
                    })
                    .once("end", () => {
                        this.logger.info("Sequence stream ended");
                        res();
                    })
                    .pipe(this.shouldSerialize ? this.outputDataStream : this.hostClient.outputStream);

                this.provides = intermediate.topic || "";
                this.providesContentType = intermediate.contentType || "";

                this.sendPang({ provides: this.provides, contentType: this.providesContentType });
                MessageUtils.writeMessageOnStream(
                    [
                        RunnerMessageCode.PANG,
                        {
                            provides: intermediate.topic || "",
                            contentType: intermediate.contentType || "",
                            outputEncoding: this.instanceOutput.readableEncoding
                        }
                    ],
                    this.hostClient.monitorStream
                );
            } else {
                // TODO: this should push a PANG message with the sequence description
                this.logger.info("Sequence did not output a stream");
                res();
            }
        });
    }

    handleSequenceEvents() {
        this.emitter.on("error", (e) => {
            this.logger.error("Sequence emitted an error event", e);
        });
    }
}
