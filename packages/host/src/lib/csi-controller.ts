import {
    AppError,
    CSIControllerError,
    HostError,
    InstanceAdapterError,
    MessageUtilities
} from "@scramjet/model";
import { development } from "@scramjet/sth-config";

import {
    APIRoute,
    AppConfig,
    DownstreamStreamsConfig,
    EncodedMessage,
    EventMessageData,
    HandshakeAcknowledgeMessage,
    HostProxy,
    ICommunicationHandler,
    ILifeCycleAdapterRun,
    InstanceLimits,
    InstanceStats,
    IObjectLogger,
    MessageDataType,
    MonitoringMessageData,
    OpResponse,
    ParsedMessage,
    PassThroughStreamsConfig,
    ReadableStream,
    SequenceInfo,
    STHConfiguration,
    STHRestAPI,
    StopSequenceMessageData,
    WritableStream
} from "@scramjet/types";
import { CommunicationChannel as CC, InstanceStatus, RunnerMessageCode } from "@scramjet/symbols";
import { Duplex, PassThrough, Readable } from "stream";

import { DuplexStream, getRouter } from "@scramjet/api-server";
import { EventEmitter, once } from "events";
import { ServerResponse } from "http";
import { DataStream } from "scramjet";

import { getInstanceAdapter } from "@scramjet/adapters";
import { ObjLogger } from "@scramjet/obj-logger";
import { RunnerConnectInfo } from "@scramjet/types/src/runner-connect";
import { cancellableDefer, CancellablePromise, defer, promiseTimeout, TypedEmitter } from "@scramjet/utility";
import { ReasonPhrases } from "http-status-codes";
import { mapRunnerExitCode } from "./utils";

/**
 * @TODO: Runner exits after 10secs and k8s client checks status every 500ms so we need to give it some time
 * before we delete pod or it will fail with 404
 * and instance adapter will throw an error even when everything was ok.
 */
const runnerExitDelay = 15000;

type Events = {
    ping: (pingMessage: MessageDataType<RunnerMessageCode.PING>) => void;
    pang: (payload: MessageDataType<RunnerMessageCode.PANG>) => void;
    event: (payload: EventMessageData) => void;
    hourChime: () => void;
    error: (error: any) => void;
    stop: (code: number) => void;
    end: (code: number) => void;
    terminated: (code: number) => void;
};

const BPMux = require("bpmux").BPMux;

export type CSIControllerInfo = { ports?: any; created?: Date; started?: Date; ended?: Date; };
/**
 * Handles all Instance lifecycle, exposes instance's HTTP API.
 *
 * @todo write interface for CSIController and CSIDispatcher
 */
export class CSIController extends TypedEmitter<Events> {
    id: string;

    private instanceLifetimeExtensionDelay: number;

    private keepAliveRequested?: boolean;
    private _lastStats?: MonitoringMessageData;
    private bpmux: any;

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
    controlDataStream?: DataStream;
    router?: APIRoute;
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
        private adapter: STHConfiguration["runtimeAdapter"] = sthConfig.runtimeAdapter
    ) {
        super();
        this.id = this.handshakeMessage.id;
        this.runnerSystemInfo = this.handshakeMessage.payload.system;
        this.sequence = this.handshakeMessage.sequenceInfo;
        this.appConfig = this.handshakeMessage.payload.appConfig;
        this.args = this.handshakeMessage.payload.args;
        this.outputTopic = this.handshakeMessage.payload.outputTopic;
        this.inputTopic = this.handshakeMessage.payload.inputTopic;
        this.limits = {
            memory: handshakeMessage.payload.limits?.memory || sthConfig.docker.runner.maxMem,
            gpu: handshakeMessage.payload.limits?.gpu
        };

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
    }

    async start(): Promise<void> {
        const i = new Promise<void>((res, rej) => {
            this.initResolver = { res, rej };
            this.startInstance();
        });

        i.then(() => this.main()).catch(async (e) => {
            this.logger.info("Instance status: errored", e);

            this.status ||= InstanceStatus.ERRORED;

            this.executionTime = this.info.created ? (Date.now() - this.info.created!.getTime()) / 1000 : -1;

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
        this.logger.debug("function InstanceStopped called");

        if (!this.instancePromise) {
            throw new CSIControllerError("UNATTACHED_STREAMS");
        }

        return this.instancePromise;
    }

    unhookupStreams() {
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
            this.logger.addSerializedLoggerSource(streams[CC.LOG]);
        }

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

        this.upStreams[CC.MONITORING].resume();
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
        this.inputTopic = message[1].payload?.inputTopic;
        this.outputTopic = message[1].payload?.outputTopic;
        // TODO: add message to initiate the instance adapter

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
        this.bpmux?.removeAllListeners();
        if (this.downStreams) this.unhookupStreams();

        this.bpmux = null;
        this.downStreams = null;
    }

    async handleInstanceReconnect(streams: DownstreamStreamsConfig) {
        await this.handleInstanceDisconnect();
        await this.handleInstanceConnect(streams);
    }

    //@TODO: ! unhookup ! set proper state for reconnecting !
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
        if (!this.upStreams) {
            throw new AppError("UNATTACHED_STREAMS");
        }

        this.router = getRouter();

        this.router.get("/", () => this.getInfo());

        /**
         * @experimental
         */
        this.router.duplex("/inout", (duplex, _headers) => {
            if (!this.inputHeadersSent) {
                this.downStreams![CC.IN].write(`Content-Type: ${_headers["content-type"]}\r\n`);
                this.downStreams![CC.IN].write("\r\n");

                this.inputHeadersSent = true;
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

        this.router.upstream("/output", this.upStreams[CC.OUT], { encoding: this.outputEncoding });

        this.router.downstream("/input", (req) => {
            if (this.apiInputEnabled) {
                const stream = this.downStreams![CC.IN];
                const contentType = req.headers["content-type"];

                // @TODO: Check if subsequent requests have the same content-type.
                if (!this.inputHeadersSent) {
                    if (contentType === undefined) {
                        return { opStatus: ReasonPhrases.NOT_ACCEPTABLE, error: "Content-Type must be defined" };
                    }

                    stream.write(`Content-Type: ${contentType}\r\n`);
                    stream.write("\r\n");

                    this.inputHeadersSent = true;
                }

                return stream;
            }

            return { opStatus: ReasonPhrases.METHOD_NOT_ALLOWED, error: "Input provided in other way" };
        }, { checkContentType: false, end: true, encoding: "binary" });

        // monitoring data
        this.router.get("/health", RunnerMessageCode.MONITORING, this.communicationHandler);

        // We are not able to obtain all necessary information for this endpoint yet, disabling it for now
        // router.get("/status", RunnerMessageCode.STATUS, this.communicationHandler);

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.EVENT, (data) => {
            const event = data[1];

            if (!event.eventName) return;

            this.emit("event", event);

            this.localEmitter.lastEvents[event.eventName] = event.message;
            this.localEmitter.emit(event.eventName, event);
        });

        this.router.upstream("/events/:name", async (req: ParsedMessage, res: ServerResponse) => {
            const name = req.params?.name;

            if (!name) {
                throw new HostError("EVENT_NAME_MISSING");
            }
            const out = new DataStream();
            const handler = (data: EventMessageData) => {
                if (typeof data !== "object") {
                    out.write(data);

                    return;
                }

                const { message } = data;

                out.write(message ? message : {});
            };

            const clean = () => {
                this.logger.debug(`Event stream "${name}" disconnected`);

                this.localEmitter.off(name, handler);
            };

            this.logger.debug("Event stream connected", name);

            this.localEmitter.on(name, handler);

            res.on("error", clean);
            res.on("end", clean);

            return out.JSONStringify();
        });

        const awaitEvent = async (req: ParsedMessage): Promise<unknown> => new Promise((res) => {
            const name = req.params?.name;

            if (!name)
                throw new HostError("EVENT_NAME_MISSING");

            this.localEmitter.once(name, (data) => res(data.message));
        });

        this.router.get("/event/:name", async (req) => {
            if (req.params?.name && this.localEmitter.lastEvents[req.params.name]) {
                return this.localEmitter.lastEvents[req.params.name];
            }

            return awaitEvent(req);
        });
        this.router.get("/once/:name", awaitEvent);

        // operations
        this.router.op("post", "/_monitoring_rate", RunnerMessageCode.MONITORING_RATE, this.communicationHandler);
        this.router.op("post", "/_event", (req) => this.handleEvent(req), this.communicationHandler);

        this.router.op("post", "/_stop", (req) => this.handleStop(req), this.communicationHandler);
        this.router.op("post", "/_kill", (req) => this.handleKill(req), this.communicationHandler);
    }

    private async handleEvent(event: ParsedMessage): Promise<OpResponse<STHRestAPI.SendEventResponse>> {
        const [, { eventName, message }] = event.body;

        if (typeof eventName !== "string")
            return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Invalid format, eventName missing." };

        await this.emitEvent({ eventName, source: "api", message });
        return { opStatus: ReasonPhrases.OK, accepted: ReasonPhrases.OK };
    }

    public async emitEvent({ source, eventName, message }: EventMessageData) {
        await this.communicationHandler.sendControlMessage(RunnerMessageCode.EVENT, {
            eventName,
            source,
            message
        });
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
        if (this.status !== InstanceStatus.RUNNING) {
            return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Instance not running" };
        }

        const { body: { removeImmediately = false } = { removeImmediately: false } } = req;

        if (typeof removeImmediately !== "boolean")
            return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Invalid removeImmediately format" };

        await this.kill({ removeImmediately });

        return {
            opStatus: ReasonPhrases.ACCEPTED,
            ...this.getInfo()
        };
    }

    async kill(opts = { removeImmediately: false }) {
        if (this.status === InstanceStatus.KILLING) {
            await this.instanceAdapter.remove();

            return;
        }

        this.status = InstanceStatus.KILLING;

        await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});

        // This will be resolved after HTTP response. It's not awaited on purpose
        promiseTimeout(this.endOfSequence, runnerExitDelay)
            .catch(() => this.instanceAdapter.remove());

        if (opts.removeImmediately) {
            this.instanceLifetimeExtensionDelay = 0;

            if (this.finalizingPromise) {
                this.finalizingPromise.cancel();
            }
        }
    }

    getInfo(): STHRestAPI.GetInstanceResponse {
        this.logger.debug("Get info [seq, info]", this.sequence, this.info);

        return {
            id: this.id,
            appConfig: this.appConfig,
            args: this.args,
            provides: this.provides,
            requires: this.requires,
            sequence: {
                id: this.sequence.id,
                config: this.sequence.config,
                name: this.sequence.name,
                location : this.sequence.location
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
        return this.upStreams[CC.OUT];
    }

    getInputStream(): WritableStream<any> {
        return this.downStreams![CC.IN];
    }

    getLogStream(): Readable {
        return this.upStreams[CC.LOG];
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
