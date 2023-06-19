import {
    APIRoute,
    AppConfig,
    DownstreamStreamsConfig,
    EncodedMessage,
    HandshakeAcknowledgeMessage,
    ICommunicationHandler,
    ParsedMessage,
    PassThroughStreamsConfig,
    ReadableStream,
    SequenceInfo,
    WritableStream,
    InstanceConfig,
    ILifeCycleAdapterRun,
    MessageDataType,
    IObjectLogger,
    STHRestAPI,
    STHConfiguration,
    InstanceLimits,
    InstanceStatus,
    MonitoringMessageData,
    InstanceStats,
    OpResponse,
    StopSequenceMessageData,
    HostProxy,
} from "@scramjet/types";
import {
    AppError,
    CSIControllerError,
    CommunicationHandler,
    HostError,
    MessageUtilities,
    InstanceAdapterError,
} from "@scramjet/model";
import { CommunicationChannel as CC, RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";
import { Duplex, PassThrough, Readable } from "stream";
import { development } from "@scramjet/sth-config";

import { DataStream } from "scramjet";
import { EventEmitter, once } from "events";
import { ServerResponse } from "http";
import { DuplexStream, getRouter } from "@scramjet/api-server";

import { getInstanceAdapter } from "@scramjet/adapters";
import { cancellableDefer, CancellablePromise, defer, promiseTimeout, TypedEmitter } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";
import { ReasonPhrases } from "http-status-codes";

/**
 * @TODO: Runner exits after 10secs and k8s client checks status every 500ms so we need to give it some time
 * before we delete pod or it will fail with 404
 * and instance adapter will throw an error even when everything was ok.
 */
const runnerExitDelay = 15000;

type Events = {
    pang: (payload: MessageDataType<RunnerMessageCode.PANG>) => void;
    hourChime: () => void;
    error: (error: any) => void;
    stop: (code: number) => void;
    end: (code: number) => void;
    terminated: (code: number) => void;
};

const BPMux = require("bpmux").BPMux;

/**
 * Handles all Instance lifecycle, exposes instance's HTTP API.
 */
export class CSIController extends TypedEmitter<Events> {
    id: string;

    private instanceLifetimeExtensionDelay: number;

    private keepAliveRequested?: boolean;
    private _lastStats?: MonitoringMessageData;
    private bpmux: any;
    private adapter: string;

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
    hostProxy: HostProxy;
    sthConfig: STHConfiguration;
    limits: InstanceLimits = {};
    sequence: SequenceInfo;
    appConfig: AppConfig;
    instancePromise?: Promise<{ message: string, exitcode: number; status: InstanceStatus }>;
    args: Array<any> | undefined;
    controlDataStream?: DataStream;
    router?: APIRoute;
    info: { ports?: any; created?: Date; started?: Date; ended?: Date; } = {};
    status: InstanceStatus;
    terminated?: { exitcode: number; reason: string; };
    provides?: string;
    requires?: string;

    initResolver?: { res: Function; rej: Function };
    heartBeatResolver?: { res: Function; rej: Function };
    heartBeatPromise?: Promise<string>;

    heartBeatTicker?: NodeJS.Timeout;
    logMux?: PassThrough;

    apiOutput = new PassThrough();
    apiInputEnabled = true;

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
    private downStreams?: DownstreamStreamsConfig;
    private upStreams?: PassThroughStreamsConfig;

    communicationHandler: ICommunicationHandler;

    constructor(
        id: string,
        sequence: SequenceInfo,
        payload: STHRestAPI.StartSequencePayload,
        communicationHandler: CommunicationHandler,
        sthConfig: STHConfiguration,
        hostProxy: HostProxy,
        chosenAdapter: STHConfiguration["runtimeAdapter"] = sthConfig.runtimeAdapter
    ) {
        super();

        this.id = id;
        this.adapter = chosenAdapter;
        this.sequence = sequence;
        this.appConfig = payload.appConfig;
        this.sthConfig = sthConfig;
        this.args = payload.args;
        this.outputTopic = payload.outputTopic;
        this.inputTopic = payload.inputTopic;
        this.hostProxy = hostProxy;
        this.limits = {
            memory: payload.limits?.memory || sthConfig.docker.runner.maxMem
        };

        this.instanceLifetimeExtensionDelay = +sthConfig.timings.instanceLifetimeExtensionDelay;
        this.communicationHandler = communicationHandler;

        this.logger = new ObjLogger(this, { id });

        this.logger.debug("Constructor executed");
        this.info.created = new Date();
        this.status = InstanceStatus.INITIALIZING;
    }

    async start() {
        const i = new Promise((res, rej) => {
            this.initResolver = { res, rej };
            this.startInstance();
        });

        i.then(() => this.main()).catch(async (e) => {
            this.logger.info("Instance status: errored", e);
            this.status ||= InstanceStatus.ERRORED;
            this.setExitInfo(e.exitcode, e.message);

            this.emit("error", e);
            this.emit("terminated", e.exitcode);

            await defer(runnerExitDelay);

            this.emit("end", e.exitcode);
        });

        return i;
    }

    async main() {
        this.status = InstanceStatus.RUNNING;
        this.logger.trace("Instance started");

        let code = -1;

        const interval = setInterval(() => this.emit("hourChime"), 3600e3);

        try {
            const stopResult = await this.instanceStopped();

            if (stopResult) {
                code = stopResult.exitcode;
                this.logger.trace("Instance ended with code", code);
                this.status = stopResult.status;
                this.setExitInfo(code, stopResult.message);
            }
        } catch (e: any) {
            code = e.exitcode;
            this.status = e.status || InstanceStatus.ERRORED;
            this.setExitInfo(code, e.reason);

            this.logger.error("Instance caused error", e.message, code);
        } finally {
            clearInterval(interval);
        }

        this.info.ended = new Date();
        this.emit("terminated", code);

        this.logger.trace("Finalizing...");

        await this.finalize();

        this.emit("end", code);
    }

    startInstance() {
        this._instanceAdapter = getInstanceAdapter(this.adapter, this.sthConfig, this.id);

        this._instanceAdapter.logger.pipe(this.logger, { end: false });

        const instanceConfig: InstanceConfig = {
            ...this.sequence.config,
            limits: this.limits,
            instanceAdapterExitDelay: this.sthConfig.timings.instanceAdapterExitDelay
        };

        const instanceMain = async () => {
            try {
                this.status = InstanceStatus.STARTING;

                await this.instanceAdapter.init();

                this.logger.trace("Streams hooked and routed");

                this.endOfSequence = this.instanceAdapter.run(
                    instanceConfig,
                    this.sthConfig.host.instancesServerPort,
                    this.id
                );

                this.logger.trace("Sequence initialized");

                const exitcode = await this.endOfSequence;

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
            .then((exitcode) => this.mapRunnerExitCode(exitcode))
            .catch((error) => {
                this.logger.error("Instance promise rejected", error);
                this.initResolver?.rej(error);

                return error;
            });

        this.instancePromise.finally(() => {
            this.heartBeatResolver?.res(this.id);
        });
    }

    heartBeatTick(): void {
        this.heartBeatResolver?.res(this.id);
        this.heartBeatPromise = new Promise((res, rej) => {
            this.heartBeatResolver = { res, rej };
        });
    }

    // eslint-disable-next-line complexity
    private mapRunnerExitCode(exitcode: number): Promise<
        { message: string, exitcode: number, status: InstanceStatus }
    > {
        // eslint-disable-next-line default-case
        switch (exitcode) {
            case RunnerExitCode.INVALID_ENV_VARS: {
                return Promise.reject({
                    message: "Runner was started with invalid configuration. This is probably a bug in STH.",
                    exitcode: RunnerExitCode.INVALID_ENV_VARS,
                    status: InstanceStatus.ERRORED
                });
            }
            case RunnerExitCode.PODS_LIMIT_REACHED: {
                return Promise.reject({
                    message: "Instance limit reached",
                    exitcode: RunnerExitCode.PODS_LIMIT_REACHED,
                    status: InstanceStatus.ERRORED
                });
            }
            case RunnerExitCode.INVALID_SEQUENCE_PATH: {
                return Promise.reject({
                    message: `Sequence entrypoint path ${this.sequence.config.entrypointPath} is invalid. ` +
                        "Check `main` field in Sequence package.json",
                    exitcode: RunnerExitCode.INVALID_SEQUENCE_PATH,
                    status: InstanceStatus.ERRORED
                });
            }
            case RunnerExitCode.SEQUENCE_FAILED_ON_START: {
                return Promise.reject({
                    message: "Sequence failed on start",
                    exitcode: RunnerExitCode.SEQUENCE_FAILED_ON_START,
                    status: InstanceStatus.ERRORED
                });
            }
            case RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION: {
                return Promise.reject({
                    message: "Sequence failed during execution",
                    exitcode: RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION,
                    status: InstanceStatus.ERRORED
                });
            }
            case RunnerExitCode.SEQUENCE_UNPACK_FAILED: {
                return Promise.reject({
                    message: "Sequence unpack failed",
                    exitcode: RunnerExitCode.SEQUENCE_UNPACK_FAILED,
                    status: InstanceStatus.ERRORED
                });
            }
            case RunnerExitCode.KILLED: {
                return Promise.resolve({
                    message: "Instance killed", exitcode: RunnerExitCode.KILLED, status: InstanceStatus.COMPLETED
                });
            }
            case RunnerExitCode.STOPPED: {
                return Promise.resolve({
                    message: "Instance stopped", exitcode: RunnerExitCode.STOPPED, status: InstanceStatus.COMPLETED
                });
            }
        }

        if (exitcode > 0) {
            return Promise.reject({ message: "Runner failed", exitcode, status: InstanceStatus.ERRORED });
        }

        return Promise.resolve({ message: "Instance completed", exitcode, status: InstanceStatus.COMPLETED });
    }

    async cleanup() {
        await this.instanceAdapter.cleanup();

        this.logger.info("Cleanup completed");
    }

    get isRunning() { return !this.finalizingPromise; }

    async finalize() {
        this.upStreams![CC.STDIN].unpipe();
        this.upStreams![CC.IN].unpipe();

        await defer(runnerExitDelay);

        this.logger.debug(`Extended CSICLifetime: ${this.instanceLifetimeExtensionDelay}ms`);
        this.finalizingPromise = cancellableDefer(this.instanceLifetimeExtensionDelay);

        await this.finalizingPromise;

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
        if (!this.instancePromise) {
            throw new CSIControllerError("UNATTACHED_STREAMS");
        }

        return this.instancePromise;
    }

    hookupStreams(streams: DownstreamStreamsConfig) {
        this.logger.trace("Hookup streams");

        this.downStreams = streams;

        if (development()) {
            streams[CC.STDOUT].pipe(process.stdout);
            streams[CC.STDERR].pipe(process.stderr);
            this.logger.addSerializedLoggerSource(streams[CC.LOG]);
        }

        this.upStreams = [
            new PassThrough(), new PassThrough(), new PassThrough(), new PassThrough(),
            new PassThrough(), new PassThrough(), new PassThrough(), new PassThrough(),
        ];

        this.upStreams.forEach((stream, i) => stream?.on("error", (err) => {
            this.logger.error("Downstream error on channel", i, err);
        }));

        this.communicationHandler.hookUpstreamStreams(this.upStreams);
        this.communicationHandler.hookDownstreamStreams(this.downStreams);

        this.communicationHandler.pipeStdio();
        this.communicationHandler.pipeMessageStreams();
        this.communicationHandler.pipeDataStreams();

        this.controlDataStream = new DataStream();
        this.controlDataStream
            .JSONStringify()
            .pipe(this.upStreams[CC.CONTROL]);

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.PING, async (message) => {
            await this.handleHandshake(message);

            return null;
        });

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.PANG, async (message) => {
            this.logger.info("PANG");
            const pangData = message[1];

            this.provides ||= this.outputTopic || pangData.provides;
            this.requires ||= this.inputTopic || pangData.requires;

            if (this.requires) {
                this.apiInputEnabled = false;
            }

            this.emit("pang", {
                provides: this.provides,
                requires: this.requires,
                contentType: pangData.contentType
            });
        });

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.MONITORING, async message => {
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

        this.upStreams[CC.MONITORING].resume();
    }

    async handleHandshake(message: EncodedMessage<RunnerMessageCode.PING>) {
        this.logger.debug("PING received", message);

        if (!message[1].ports) {
            this.logger.trace("Received a PING message but didn't receive ports config");
        }

        this.info.ports = message[1].ports;

        if (this.controlDataStream) {
            const pongMsg: HandshakeAcknowledgeMessage = {
                msgCode: RunnerMessageCode.PONG,
                appConfig: this.appConfig,
                args: this.args
            } as HandshakeAcknowledgeMessage;

            await this.controlDataStream.whenWrote(MessageUtilities.serializeMessage<RunnerMessageCode.PONG>(pongMsg));
        } else {
            throw new CSIControllerError("UNINITIALIZED_STREAM", "control");
        }

        this.info.started = new Date();
        this.logger.info("Instance started", this.info);
    }

    async handleInstanceConnect(streams: DownstreamStreamsConfig) {
        try {
            this.hookupStreams(streams);
            this.createInstanceAPIRouter();

            this.bpmux = new BPMux(streams[8]);
            this.bpmux.on("error", (e: any) => {
                this.logger.warn("Instance client multiplex connection errored", e.message);
                streams[8]?.end();
            });
            this.bpmux.on("peer_multiplex", (socket: Duplex, _data: any) => this.hostProxy.onInstanceRequest(socket));
            await once(this, "pang");
            this.initResolver?.res();
        } catch (e: any) {
            this.initResolver?.rej(e);
        }
    }

    createInstanceAPIRouter() {
        let inputHeadersSent = false;

        if (!this.upStreams) {
            throw new AppError("UNATTACHED_STREAMS");
        }

        this.router = getRouter();

        this.router.get("/", () => this.getInfo());

        /**
         * @experimental
         */
        this.router.duplex("/inout", (duplex, _headers) => {
            if (!inputHeadersSent) {
                this.downStreams![CC.IN].write(`Content-Type: ${_headers["content-type"]}\r\n`);
                this.downStreams![CC.IN].write("\r\n");

                inputHeadersSent = true;
            }

            (duplex as unknown as DuplexStream).input.pipe(this.downStreams![CC.IN], { end: false });
            this.upStreams![CC.OUT]?.pipe((duplex as unknown as DuplexStream).output, { end: false });
        });

        this.router.upstream("/stdout", this.upStreams[CC.STDOUT]);
        this.router.upstream("/stderr", this.upStreams[CC.STDERR]);
        this.router.downstream("/stdin", this.upStreams[CC.STDIN], { end: true });

        const logStream = this.upStreams[CC.LOG];

        const mux = this.logMux = new PassThrough();

        logStream.pipe(mux, { end: false });
        logStream.on("end", () => {
            logStream.unpipe(mux);
        });

        this.logger.pipe(mux);

        mux.unpipe = (...args) => {
            logStream.unpipe(mux);
            this.logger.unpipe(mux);

            return PassThrough.prototype.unpipe.call(mux, ...args);
        };

        this.router.upstream("/log", mux);

        if (development()) {
            this.router.upstream("/monitoring", this.upStreams[CC.MONITORING]);
        }
        this.router.upstream("/output", this.upStreams[CC.OUT]);

        this.router.downstream("/input", (req) => {
            if (this.apiInputEnabled) {
                const stream = this.downStreams![CC.IN];
                const contentType = req.headers["content-type"];

                // @TODO: Check if subsequent requests have the same content-type.
                if (!inputHeadersSent) {
                    if (contentType === undefined) {
                        return { opStatus: ReasonPhrases.NOT_ACCEPTABLE, error: "Content-Type must be defined" };
                    }

                    stream.write(`Content-Type: ${contentType}\r\n`);
                    stream.write("\r\n");

                    inputHeadersSent = true;
                }

                return stream;
            }

            return { opStatus: ReasonPhrases.METHOD_NOT_ALLOWED, error: "Input provided in other way" };
        }, { checkContentType: false, end: true, encoding: "binary" });

        // monitoring data
        this.router.get("/health", RunnerMessageCode.MONITORING, this.communicationHandler);

        // We are not able to obtain all necessary information for this endpoint yet, disabling it for now
        // router.get("/status", RunnerMessageCode.STATUS, this.communicationHandler);

        const localEmitter = Object.assign(
            new EventEmitter(),
            { lastEvents: {} } as { lastEvents: { [evname: string]: any } }
        );

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.EVENT, (data) => {
            const event = data[1];

            if (!event.eventName) return;

            localEmitter.lastEvents[event.eventName] = event;
            localEmitter.emit(event.eventName, event);
        });
        this.router.upstream("/events/:name", async (req: ParsedMessage, res: ServerResponse) => {
            const name = req.params?.name;

            if (!name) {
                throw new HostError("EVENT_NAME_MISSING");
            }

            const out = new DataStream();
            const handler = (data: any) => out.write(data);
            const clean = () => {
                this.logger.debug(`Event stream "${name}" disconnected`);

                localEmitter.off(name, handler);
            };

            this.logger.debug("Event stream connected", name);

            localEmitter.on(name, handler);

            res.on("error", clean);
            res.on("end", clean);

            return out.JSONStringify();
        });

        const awaitEvent = async (req: ParsedMessage): Promise<unknown> => new Promise(res => {
            const name = req.params?.name;

            if (!name) {
                throw new HostError("EVENT_NAME_MISSING");
            }

            localEmitter.once(name, res);
        });

        this.router.get("/event/:name", async (req) => {
            if (req.params?.name && localEmitter.lastEvents[req.params.name]) {
                return localEmitter.lastEvents[req.params.name];
            }

            return awaitEvent(req);
        });
        this.router.get("/once/:name", awaitEvent);

        // operations
        this.router.op("post", "/_monitoring_rate", RunnerMessageCode.MONITORING_RATE, this.communicationHandler);
        this.router.op("post", "/_event", RunnerMessageCode.EVENT, this.communicationHandler);

        this.router.op("post", "/_stop", (req) => this.handleStop(req), this.communicationHandler);
        this.router.op("post", "/_kill", (req) => this.handleKill(req), this.communicationHandler);
    }

    private async handleStop(req: ParsedMessage): Promise<OpResponse<STHRestAPI.SendStopInstanceResponse>> {
        const { body: { timeout = 7000, canCallKeepalive = false } = { timeout: 7000, canCallKeepalive: false } } = req;

        if (typeof timeout !== "number") {
            return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Invalid timeout format" };
        }
        if (typeof canCallKeepalive !== "boolean") {
            return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Invalid canCallKeepalive format" };
        }
        const message: StopSequenceMessageData = { timeout, canCallKeepalive };

        this.status = InstanceStatus.STOPPING;

        await this.communicationHandler.sendControlMessage(RunnerMessageCode.STOP, message);

        this.keepAliveRequested = false;

        await defer(timeout || 0);

        if (!this.keepAliveRequested) {
            // TODO: shouldn't this be just this.handleKill();
            await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});
        }

        return { opStatus: ReasonPhrases.ACCEPTED, ...this.getInfo() };
    }

    private async handleKill(req: ParsedMessage): Promise<OpResponse<STHRestAPI.SendKillInstanceResponse>> {
        const { body: { removeImmediately = false } = { removeImmediately: false } } = req;

        if (typeof removeImmediately !== "boolean")
            return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Invalid removeImmediately format" };

        if (this.status === InstanceStatus.KILLING) {
            await this.instanceAdapter.remove();
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

        return {
            opStatus: ReasonPhrases.ACCEPTED,
            ...this.getInfo()
        };
    }

    getInfo(): STHRestAPI.GetInstanceResponse {
        return {
            id: this.id,
            appConfig: this.appConfig,
            args: this.args,
            provides: this.provides,
            requires: this.requires,
            sequence: this.sequence.id,
            sequenceInfo: {
                id: this.sequence.id,
                config: this.sequence.config,
                name: this.sequence.name
            },
            ports: this.info.ports,
            created: this.info.created,
            started: this.info.started,
            ended: this.info.ended,
            status: this.status,
            terminated: this.terminated
        };
    }

    getOutputStream(): ReadableStream<any> {
        return this.upStreams![CC.OUT];
    }

    getInputStream(): WritableStream<any> {
        return this.downStreams![CC.IN];
    }

    getLogStream(): Readable {
        return this.upStreams![CC.LOG];
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
