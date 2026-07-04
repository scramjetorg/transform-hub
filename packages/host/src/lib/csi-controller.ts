import {
    CSIControllerError,
    HostError,
    InstanceAdapterError,
    MessageUtilities
} from "@scramjet/model";
import { development } from "@scramjet/config";

import {
    AppConfig,
    DownstreamStreamsConfig,
    EventMessageData,
    HostProxy,
    ILifeCycleAdapterRun,
    InstanceLimits,
    InstanceStats,
    IObjectLogger,
    PassThroughStreamsConfig,
    ReadableStream,
    SequenceInfo,
    SetMessageData,
    StopSequenceMessageData,
    WritableStream,
    RunnerConnectInfo,
    IStorageAdapter,
} from "@scramjet/runtime-types";
import {
    APIRoute,
    STHConfiguration,
    STHRestAPI,
} from "@scramjet/api-types";
import {
    EncodedMessage,
    HandshakeAcknowledgeMessage,
    ICommunicationHandler,
    MessageDataType,
    MonitoringMessageData,
} from "./types/from-types";
import { RunnerTransport } from "./types/from-types";
import { CommunicationChannel as CC, InstanceStatus, RunnerMessageCode, StorageActionCode } from "@scramjet/symbols";
import { PassThrough, Readable } from "stream";
import { IncomingMessage, ServerResponse } from "http";

import { forwardRoutedRequest, getRouter, normalizeForwardedHeaders } from "@scramjet/api-server";
import { registerHttpRoutes, replacePathVersion } from "@scramjet/api-router";
import { EventEmitter, once } from "events";
import { DataStream } from "scramjet";

import { getInstanceAdapter } from "@scramjet/adapters";
import { ObjLogger } from "@scramjet/obj-logger";
import { cancellableDefer, CancellablePromise, defer, promiseTimeout, TypedEmitter } from "@scramjet/utility";

import { mapRunnerExitCode } from "./utils";
import { InstancesStore } from "./instance-store";
import { InstanceAPI } from "./api/instance-api";
import { InstanceAPIV2 } from "./api/instance-api-v2";
import { CSIEvents, ICSI } from "./types";
import { createRunnerBrokerRpcTransport, Verser2RunnerBroker, Verser2RunnerTransport } from "./runner-transport";

/**
 * @TODO: Runner exits after 10secs and k8s client checks status every 500ms so we need to give it some time
 * before we delete pod or it will fail with 404
 * and instance adapter will throw an error even when everything was ok.
 */
const runnerExitDelay = 5000;

function describeSequenceError(error: unknown): string {
    if (error instanceof Error) return error.stack || error.message;
    if (typeof error === "string") return error;
    if (error && typeof error === "object") {
        const candidate = error as { name?: unknown; message?: unknown; stack?: unknown; data?: unknown };
        const dataDetails = candidate.data ? describeSequenceError(candidate.data) : undefined;

        return [candidate.name, candidate.message, candidate.stack, dataDetails]
            .filter((value): value is string => typeof value === "string" && value.length > 0)
            .join(" ") || JSON.stringify(error);
    }

    return String(error);
}

export type CSIControllerInfo = { ports?: any; created?: Date; started?: Date; ended?: Date; };
/**
 * Handles all Instance lifecycle, exposes instance's HTTP API.
 *
 * @todo write interface for CSIController and CSIDispatcher
 */
export class CSIController extends TypedEmitter<CSIEvents> implements ICSI {
    id: string;
    private sharedLocalStorage: Record<string, string | null> = {};
    private localStorageAdapter: IStorageAdapter;
    private instanceLifetimeExtensionDelay: number;

    private keepAliveRequested?: boolean;
    private _lastStats?: MonitoringMessageData;
    private runnerTransport?: RunnerTransport;
    expose?: { path: string | undefined; host: string | undefined; port: number | undefined; };
    private inputContentType: string | undefined;
    api: InstanceAPI;
    apiV2: InstanceAPIV2;

    get rpcUrl(): string {
        return `http://${this.expose?.host}:${this.expose?.port}`;
    }

    get lastStats(): InstanceStats {
        return {
            limits: {
                memory: (this._lastStats?.limit! / (1024 * 1024)) as InstanceLimits["memory"],
            },
            current: {
                memory: this._lastStats?.memoryUsage,
            }
        };
    }

    limits: InstanceLimits = {};
    runnerSystemInfo: RunnerConnectInfo["system"];
    sequence: SequenceInfo;
    appConfig: AppConfig;
    instancePromise?: Promise<{ message: string, exitcode: number; status: InstanceStatus }>;
    args: Array<any> | undefined;
    instanceName?: string;
    controlDataStream?: DataStream;
    router?: APIRoute;
    v2Router?: APIRoute;
    info: CSIControllerInfo = {};
    status: InstanceStatus;
    terminated?: { exitcode: number; reason: string; };

    provides?: string;
    requires?: string;
    outputEncoding: BufferEncoding = "utf-8";

    initResolver?: { res: Function; rej: Function };
    heartBeatResolver?: { res: Function; rej: Function };
    heartBeatPromise?: Promise<string>;

    heartBeatTicker?: NodeJS.Timeout;
    logMux?: PassThrough;

    apiOutput = new PassThrough();
    apiInputEnabled = true;

    executionTime: number = -1;
    inputHeadersSent = false;

    /**
     * Topic to which the output stream should be routed
     */
    public outputTopic?: string;

    /**
     * Topic to which the input stream should be routed
     */
    public inputTopic?: string;

    public outputRouted = false;
    public inputRouted = false;

    /**
     * Logger.
     *
     * @type {IObjectLogger}
     */
    logger: IObjectLogger;

    private _instanceAdapter?: ILifeCycleAdapterRun;
    finalizingPromise?: CancellablePromise;

    get instanceAdapter(): ILifeCycleAdapterRun {
        if (!this._instanceAdapter) {
            throw new Error("Instance adapter uninitialized");
        }

        return this._instanceAdapter;
    }

    _endOfSequence?: Promise<number>;

    get endOfSequence(): Promise<number> {
        if (!this._endOfSequence) {
            throw new InstanceAdapterError("RUNNER_NOT_STARTED");
        }

        return this._endOfSequence;
    }

    set endOfSequence(prm: Promise<number>) {
        this._endOfSequence = prm;
    }

    /**
     * Streams connected do API.
     */
    private downStreams: DownstreamStreamsConfig | null = null;
    private upStreams: PassThroughStreamsConfig;

    public localEmitter: EventEmitter & { lastEvents: { [evname: string]: any } };
    constructor(
        private handshakeMessage: Omit<MessageDataType<RunnerMessageCode.PING>, "created">,
        public communicationHandler: ICommunicationHandler,
        private sthConfig: STHConfiguration,
        private hostProxy: HostProxy,
        private adapter: STHConfiguration["runtimeAdapter"] = sthConfig.runtimeAdapter,
        private instanceStore: InstancesStore,
        localStorageAdapter: IStorageAdapter,
        private runnerBrokerProvider?: () => Verser2RunnerBroker | undefined,
    ) {
        super();
        this.instanceStore = instanceStore;
        this.id = this.handshakeMessage.id;
        this.runnerSystemInfo = this.handshakeMessage.payload.system;
        this.sequence = this.handshakeMessage.sequenceInfo;
        this.appConfig = this.handshakeMessage.payload.appConfig;
        this.args = this.handshakeMessage.payload.args;
        this.instanceName = this.handshakeMessage.payload.instanceName;
        this.outputTopic = this.handshakeMessage.payload.outputTopic;
        this.inputTopic = this.handshakeMessage.payload.inputTopic;
        this.limits = {
            memory: handshakeMessage.payload.limits?.memory || sthConfig.docker.runner.maxMem,
            gpu: handshakeMessage.payload.limits?.gpu
        };

        this.localStorageAdapter = localStorageAdapter;
        this.instanceLifetimeExtensionDelay = +sthConfig.timings.instanceLifetimeExtensionDelay;

        this.logger = new ObjLogger(this, { id: this.id });
        this.localEmitter = Object.assign(
            new EventEmitter(),
            { lastEvents: {} }
        );

        this.status = InstanceStatus.INITIALIZING;

        this.upStreams = [
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
        ];

        this.api = new InstanceAPI(this, this.logger, this.localEmitter);
        this.apiV2 = new InstanceAPIV2(this, this.logger, this.localEmitter, replacePathVersion(this.sthConfig.host.apiBase, "v2"));
    }

    getInfo(): STHRestAPI.GetInstanceResponse {
        this.logger.debug("Get info [seq, info]", this.sequence.id, this.info);

        return {
            id: this.id,
            appConfig: this.appConfig,
            args: this.args,
            provides: this.provides,
            requires: this.requires,
            instanceName: this.instanceName,
            sequence: {
                id: this.sequence.id,
                config: this.sequence.config,
                name: this.sequence.name,
                location: this.sequence.location
            },
            ports: this.info.ports,
            created: this.info.created,
            started: this.info.started,
            ended: this.info.ended,
            status: this.status,
            terminated: this.terminated
        };
    }

    async set(payload: SetMessageData) {
        await this.communicationHandler.sendControlMessage(RunnerMessageCode.SET, payload);
    }

    async start(): Promise<void> {
        const initialized = new Promise<void>((res, rej) => {
            this.initResolver = { res, rej };
            this.startInstance();
        });

        this.sharedLocalStorage = await this.localStorageAdapter.getAllItems();
        await this.sendFullStorageState(this.id, this.sharedLocalStorage);

        initialized.then(() => this.main()).catch(async (e) => {
            this.logger.info("Instance status: errored", e);

            this.status ||= InstanceStatus.ERRORED;

            this.executionTime = this.info.created ? (Date.now() - this.info.created!.getTime()) / 1000 : -1;

            this.setExitInfo(e.exitcode, e.message);

            this.emit("error", e);
            this.emit("terminated", e.exitcode);

            await defer(runnerExitDelay);

            this.emit("end", e.exitcode);
        });

        return initialized;
    }

    async main() {
        this.status = InstanceStatus.RUNNING;
        this.logger.trace("Main. Current status:", this.status);

        let code = -1;

        const interval = setInterval(() => this.emit("hourChime"), 3600e3);

        try {
            const stopResult = await this.instanceStopped();

            this.logger.debug("Stop result", stopResult);

            if (stopResult) {
                code = stopResult.exitcode || code;
                this.logger.trace("Instance ended with code", code);
                this.status = stopResult.status;
                this.setExitInfo(code, stopResult.message);

                this.logger.debug("Exit info", this.terminated);
            }
        } catch (e: any) {
            code = e.exitcode;

            this.status = e.status || InstanceStatus.ERRORED;
            this.setExitInfo(code, e.reason);

            this.logger.error("Instance caused error", e);
        } finally {
            clearInterval(interval);
        }

        this.info.ended = new Date();
        this.executionTime = (this.info.ended.getTime() - this.info.created!.getTime()) / 1000;

        this.emit("terminated", code);

        this.logger.trace("Finalizing...", code);

        await this.finalize();

        this.emit("end", code);
    }

    startInstance() {
        this._instanceAdapter = getInstanceAdapter(this.adapter, this.sthConfig, this.id);

        this._instanceAdapter.logger.pipe(this.logger, { end: false });

        this.endOfSequence = this._instanceAdapter.waitUntilExit(undefined, this.id, this.sequence);

        // @todo this also is moved to CSIDispatcher in entirety
        const instanceMain = async () => {
            try {
                this.status = InstanceStatus.STARTING;

                this.logger.trace("Streams hooked and routed");

                this.logger.trace("Sequence initialized");

                const exitcode = await this.endOfSequence;

                this.logger.trace("End of sequence", exitcode);

                if (exitcode > 0) {
                    this.status = InstanceStatus.ERRORED;
                    this.logger.error("Crashlog", await this.instanceAdapter.getCrashLog());
                }

                await this.cleanup();

                return exitcode;
            } catch (error: any) {
                this.status = InstanceStatus.ERRORED;
                this.logger.error("Error caught", error.stack);

                await this.cleanup();

                return error.code || 213;
            }
        };

        this.instancePromise = instanceMain()
            .then((exitcode) => {
                this.logger.debug("instanceMain ExitCode", exitcode);
                return mapRunnerExitCode(exitcode, this.sequence);
            })
            .catch((error) => {
                this.logger.error("Instance promise rejected", error);
                this.initResolver?.rej(error);

                return error;
            });

        // @todo - this should be checked by CSIController, but Dispatcher should know about this via event listener.
        this.instancePromise.finally(() => {
            this.heartBeatResolver?.res(this.id);
        }).catch(() => 0);
    }

    heartBeatTick(): void {
        this.heartBeatResolver?.res(this.id);
        this.heartBeatPromise = new Promise((res, rej) => {
            this.heartBeatResolver = { res, rej };
        });
    }

    async cleanup() {
        await this.instanceAdapter.cleanup();

        this.logger.info("Cleanup completed");
    }

    get isRunning() { return !this.finalizingPromise; }

    async finalize(immediate: boolean = false) {
        this.upStreams![CC.STDIN].unpipe();
        this.upStreams![CC.IN].unpipe();

        if (immediate) {
            await defer(runnerExitDelay);
        } else if (this.instanceLifetimeExtensionDelay > 0) {
            this.logger.debug(`Extended CSICLifetime: ${this.instanceLifetimeExtensionDelay}ms`);
            this.finalizingPromise = cancellableDefer(this.instanceLifetimeExtensionDelay);
            await this.finalizingPromise;
        }

        this.downStreams![CC.STDOUT].unpipe();
        this.downStreams![CC.STDERR].unpipe();
        this.downStreams![CC.OUT].unpipe();

        this.upStreams![CC.STDOUT].end();
        this.upStreams![CC.STDERR].end();
        this.upStreams![CC.OUT].end();

        this.logger.info("Finalized");
        this.logger.end();
    }

    instanceStopped(): CSIController["instancePromise"] {
        this.logger.debug("function InstanceStopped called");

        if (!this.instancePromise) {
            throw new CSIControllerError("UNATTACHED_STREAMS");
        }

        return this.instancePromise;
    }

    unhookStreams() {
        this.downStreams![CC.STDOUT].unpipe();
        this.downStreams![CC.STDERR].unpipe();
        this.downStreams![CC.OUT].unpipe();
        this.upStreams![CC.STDOUT].unpipe();
        this.upStreams![CC.STDERR].unpipe();
        this.upStreams![CC.OUT].unpipe();
    }

    hookupStreams(streams: DownstreamStreamsConfig) {
        this.logger.trace("Hookup streams");

        this.downStreams = streams;

        if (development()) {
            streams[CC.STDOUT].pipe(process.stdout);
            streams[CC.STDERR].pipe(process.stderr);
        }

        this.upStreams.forEach((stream, i) => stream?.on("error", (err: Error) => {
            this.logger.error("Downstream error on channel", i, err);
        }));

        const runnerBroker = this.runnerBrokerProvider?.();

        if (!runnerBroker) {
            throw new CSIControllerError("UNINITIALIZED_STREAM", "verser2 runner broker");
        }

        const runnerTransport = new Verser2RunnerTransport({
            broker: runnerBroker,
            upstreams: this.upStreams,
            communicationHandler: this.communicationHandler,
            routeReadinessMs: this.sthConfig.verser2.timeouts.routeReadinessMs
        });

        this.runnerTransport = runnerTransport;
        runnerTransport.connect({ instanceId: this.id, streams }).catch((error: Error) => {
            this.logger.error(`${runnerTransport.kind} runner transport connection failed`, error);
            this.initResolver?.rej(error);
        });

        this.controlDataStream = new DataStream();
        this.controlDataStream
            .JSONStringify()
            .pipe(this.upStreams[CC.CONTROL]);

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.PING, async (message) => {
            const { status, payload, inputHeadersSent } = message[1];

            this.status = status || InstanceStatus.RUNNING;
            this.inputHeadersSent = inputHeadersSent;

            if (!payload) {
                this.emit("error", "No payload in ping!");

                return null;
            }

            this.args = payload.args;
            this.info.created = new Date(message[1].created);

            this.provides ||= this.outputTopic || payload?.outputTopic;
            this.requires ||= this.inputTopic || payload?.inputTopic;

            await this.handleHandshake(message);

            this.emit("ping", message[1]);

            return null;
        });

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.PANG, async (message) => {
            const pangData = message[1];

            this.provides ||= this.outputTopic || pangData.provides;
            this.requires ||= this.inputTopic || pangData.requires;

            if (this.requires) {
                this.apiInputEnabled = false;
            }

            this.outputEncoding = pangData.outputEncoding || "utf-8";
            //this.upStreams[CC.OUT].setDefaultEncoding(pangData.outputEncoding || "utf-8");

            this.emit("pang", {
                provides: this.provides,
                requires: this.requires,
                contentType: pangData.contentType
            });
        });

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.MONITORING, async message => {
            await this.controlDataStream?.whenWrote(
                MessageUtilities.serializeMessage<RunnerMessageCode.MONITORING_REPLY>({ msgCode: RunnerMessageCode.MONITORING_REPLY })
            );

            const stats = await this.instanceAdapter.stats(message[1]);

            this._lastStats = stats;

            this.heartBeatTick();

            message[1] = stats;

            return message;
        }, true);

        this.communicationHandler.addMonitoringHandler(
            RunnerMessageCode.ALIVE,
            (message) => this.handleKeepAliveCommand(message)
        );

        this.communicationHandler.addMonitoringHandler(
            RunnerMessageCode.SEQUENCE_STOPPED,
            message => this.handleSequenceStopped(message)
        );

        this.communicationHandler.addMonitoringHandler(
            RunnerMessageCode.SEQUENCE_COMPLETED,
            message => this.handleSequenceCompleted(message)
        );

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.EVENT, (data) => {
            const event = data[1];

            if (!event.eventName) return;

            this.emit("event", event);

            this.localEmitter.lastEvents[event.eventName] = event.message;
            this.localEmitter.emit(event.eventName, event);
        });

        // Handle storage updates FROM the runner so setItem/getItem
        // roundtrips complete.  When the runner writes STORAGE_UPDATE
        // on the monitoring channel, apply the change locally and
        // broadcast it to all instances (including the originator).
        this.communicationHandler.addMonitoringHandler(
            RunnerMessageCode.STORAGE_UPDATE,
            async (message) => {
                const { key, value } = message[1];

                await this.applyUpdate(key, value);
                await this.broadcastUpdate(key, value);
                return message;
            }
        );

        this.upStreams[CC.MONITORING].resume();
    }

    async applyUpdate(key: string, value: string | null): Promise<void> {
        if (key === StorageActionCode.CLEAR && value === null) {
            this.sharedLocalStorage = {};
            await this.localStorageAdapter.clear();
        } else if (value === null) {
            delete this.sharedLocalStorage[key];
            await this.localStorageAdapter.removeItem(key);
        } else {
            this.sharedLocalStorage[key] = value;
            await this.localStorageAdapter.setItem(key, value);
        }
    }

    async broadcastUpdate(key: string, value: string | null) {
        return Promise.all(
            this.instanceStore.map(async (csi) => csi.sendStorageUpdate(key, value))
        );
    }

    async sendStorageUpdate(key: string, value: string | null) {
        this.logger.debug("Sending storage update to Runner", key, value);
        await this.communicationHandler.sendControlMessage(
            RunnerMessageCode.STORAGE_UPDATE,
            { key, value }
        );
    }

    async sendFullStorageState(runnerId: string, sharedLocalStorage: Record<string, any>) {
        this.logger.debug("Sending full storage state to Runner", runnerId, sharedLocalStorage);
        await this.communicationHandler.sendControlMessage(
            RunnerMessageCode.STORAGE,
            { values: sharedLocalStorage }
        );
    }

    async getInput(contentType?: string) {
        const stream = this.downStreams![CC.IN];

        // @TODO: Check if subsequent requests have the same content-type.
        if (!this.inputHeadersSent) {
            if (contentType === undefined) {
                throw new HostError("INVALID_CONTENT_TYPE", "Content-Type must be defined");
            }

            stream.write(`Content-Type: ${contentType}\r\n`);
            stream.write("\r\n");

            this.inputContentType = contentType;
            this.inputHeadersSent = true;
        } else if (contentType && this.inputContentType !== contentType) {
            throw new HostError("INVALID_CONTENT_TYPE", "Content-Type must be the same as the first one");
        }

        return stream;
    }

    async awaitEvent(name: string) {
        return new Promise(res => this.localEmitter.once(name, (data) => res(data.message)));
    }

    // TODO: refactor out of CSI Controller - this should be in
    async handleHandshake(message: EncodedMessage<RunnerMessageCode.PING>) {
        this.logger.debug("PING received", JSON.stringify(message));

        if (message[1].ports) {
            this.logger.trace("Received a PING message with ports config");
        }

        this.inputHeadersSent = !!message[1].inputHeadersSent;

        this.logger.info("Headers already sent for input?", this.inputHeadersSent);

        if (this.instanceAdapter.setRunner) {
            await this.instanceAdapter.setRunner({
                ...message[1].payload.system,
                id: this.id
            });
        }

        this.info.ports = message[1].ports;
        this.sequence = message[1].sequenceInfo;
        this.appConfig = message[1].payload.appConfig;
        this.instanceName = message[1].payload.instanceName;
        this.inputTopic = message[1].payload?.inputTopic;
        this.outputTopic = message[1].payload?.outputTopic;
        // TODO: add message to initiate the instance adapter

        if (message[1].payload.exposePath) {
            this.expose = {
                path: message[1].payload.exposePath,
                host: message[1].payload.exposeHost,
                port: message[1].payload.exposePort
            };

            this.hostProxy.onRPCExpose(message[1].payload.exposePath, this.id);
        }

        if (this.controlDataStream) {
            const pongMsg: HandshakeAcknowledgeMessage = {
                msgCode: RunnerMessageCode.PONG,
                appConfig: this.appConfig,
                args: this.args,
                //runtimeId:?
            };

            await this.controlDataStream.whenWrote(MessageUtilities.serializeMessage<RunnerMessageCode.PONG>(pongMsg));
        } else {
            throw new CSIControllerError("UNINITIALIZED_STREAM", "control");
        }

        this.info.started = new Date(); //@TODO: set by runner?
        this.logger.info("Handshake", JSON.stringify(message, undefined));
    }

    async handleInstanceDisconnect() {
        await this.runnerTransport?.disconnect();

        this.runnerTransport = undefined;
        this.downStreams = null;
    }

    async handleInstanceReconnect(streams: DownstreamStreamsConfig) {
        await this.handleInstanceDisconnect();
        await this.handleInstanceConnect(streams);
    }

    async forwardRpcRequest(req: IncomingMessage, res: ServerResponse, path: string): Promise<boolean> {
        const broker = this.runnerBrokerProvider?.();

        if (!broker) {
            return false;
        }

        await forwardRoutedRequest({
            transport: createRunnerBrokerRpcTransport(broker),
            domain: Verser2RunnerTransport.getRouteDomain(this.id),
            req,
            res,
            path,
            headers: normalizeForwardedHeaders(req.headers),
            routeReadinessMs: this.sthConfig.verser2.timeouts.routeReadinessMs,
            requestTimeoutMs: this.sthConfig.verser2.timeouts.requestMs,
            onError: (error) => this.logger.warn("Host -> runner verser2 RPC request error", { id: this.id, path, error })
        });

        return true;
    }

    //@TODO: ! unhookup ! set proper state for reconnecting !
    async handleInstanceConnect(streams: DownstreamStreamsConfig) {
        try {
            this.hookupStreams(streams);
            this.createInstanceAPIRouter();

            await once(this, "pang");
            this.initResolver?.res();
        } catch (e: any) {
            this.initResolver?.rej(e);
        }
    }

    private createInstanceAPIRouter() {
        this.router = getRouter();
        const router = this.router;
        this.v2Router = getRouter();
        const v2Router = this.v2Router;

        this.api.attach(router, this.communicationHandler!);
        registerHttpRoutes(v2Router, this.apiV2.createRouter());
    }

    public async emitEvent({ source, eventName, message }: EventMessageData) {
        await this.communicationHandler.sendControlMessage(RunnerMessageCode.EVENT, {
            eventName,
            source,
            message
        });
    }

    async stop(opts: StopSequenceMessageData) {
        const message: StopSequenceMessageData = opts;

        this.status = InstanceStatus.STOPPING;

        await this.communicationHandler.sendControlMessage(RunnerMessageCode.STOP, message);

        this.keepAliveRequested = false;

        await defer(opts.timeout || 0);

        if (!this.keepAliveRequested) {
            await this.kill();
        }
    }

    async kill({ removeImmediately } = { removeImmediately: false }) {
        if (this.status === InstanceStatus.KILLING) {
            await this.instanceAdapter.remove();

            return;
        }

        this.status = InstanceStatus.KILLING;

        await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});

        // This will be resolved after HTTP response. It's not awaited on purpose
        promiseTimeout(this.endOfSequence, runnerExitDelay)
            .catch(() => this.instanceAdapter.remove());

        if (removeImmediately) {
            this.instanceLifetimeExtensionDelay = 0;

            if (this.finalizingPromise) {
                this.finalizingPromise.cancel();
            }
        }
    }

    getStdio(): [WritableStream<any>, ReadableStream<any>, ReadableStream<any>] {
        return [
            this.upStreams[CC.STDIN],
            this.upStreams[CC.STDOUT],
            this.upStreams[CC.STDERR]
        ];
    }

    getOutputStream(): ReadableStream<any> {
        return this.upStreams[CC.OUT];
    }

    getInputStream(): WritableStream<any> {
        return this.downStreams![CC.IN];
    }

    getLogStream(): Readable {
        return this.upStreams[CC.LOG];
    }

    getMonitoringStream(): Readable {
        return this.upStreams[CC.MONITORING];
    }

    // @TODO discuss this
    async handleSequenceCompleted(message: EncodedMessage<RunnerMessageCode.SEQUENCE_COMPLETED>) {
        this.logger.trace("Got message: SEQUENCE_COMPLETED.");

        try {
            if (this.instancePromise) {
                await promiseTimeout(this.instancePromise, runnerExitDelay);
            }

            this.logger.trace("Sequence terminated itself");
        } catch {
            await this.instanceAdapter.remove();

            this.logger.trace("Sequence didn't terminate itself in expected time", runnerExitDelay);
            process.exitCode = 252;
        }

        return message;
    }

    async handleSequenceStopped(message: EncodedMessage<RunnerMessageCode.SEQUENCE_STOPPED>) {
        this.logger.trace("Sequence ended, sending kill");

        const sequenceError = message[1]?.sequenceError;

        if (sequenceError) {
            const errorDetails = describeSequenceError(sequenceError);

            this.logger.error(
                `STH runtime error phase=instance-runtime adapter=${this.adapter} sequenceId=${this.sequence.id} instanceId=${this.id} error=${errorDetails}`,
                {
                    phase: "instance-runtime",
                    adapter: this.adapter,
                    sequenceId: this.sequence.id,
                    instanceId: this.id,
                    error: sequenceError
                }
            );
        }

        try {
            await promiseTimeout(this.endOfSequence, runnerExitDelay);

            this.logger.trace("Instance terminated itself");
        } catch {
            this.logger.warn("Instance failed to terminate within timeout, sending kill");

            await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});

            try {
                await promiseTimeout(this.endOfSequence, runnerExitDelay);

                this.logger.trace("Terminated with kill");
            } catch {
                this.logger.error("Sequence unresponsive, killing");

                await this.instanceAdapter.remove();
            }
        }

        return message;
    }

    // TODO: move this to host (it's needed for both Stop and Complete signals)
    handleKeepAliveCommand(message: EncodedMessage<RunnerMessageCode.ALIVE>) {
        this.logger.trace("Got keep-alive message from Sequence");

        this.keepAliveRequested = true;

        return message;
    }

    setExitInfo(exitcode: number, reason: string) {
        this.terminated = { exitcode, reason };
    }
}
