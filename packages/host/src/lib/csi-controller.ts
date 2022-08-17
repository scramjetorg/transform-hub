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
    OpResponse
} from "@scramjet/types";
import {
    AppError,
    CSIControllerError,
    CommunicationHandler,
    HostError,
    MessageUtilities,
    InstanceAdapterError,
    isStopSequenceMessage
} from "@scramjet/model";
import { CommunicationChannel as CC, RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";
import { PassThrough, Readable } from "stream";
import { development } from "@scramjet/sth-config";

import { DataStream } from "scramjet";
import { EventEmitter, once } from "events";
import { ServerResponse } from "http";
import { getRouter } from "@scramjet/api-server";

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
    pang: (payload: MessageDataType<RunnerMessageCode.PANG>) => void,
    error: (error: any) => void,
    stop: (code: number) => void
    end: (code: number) => void
}

enum TerminateReason {
    STOPPED = "stopped",
    ERRORED = "errored",
    KILLED = "killed",
    COMPLETED = "completed"
}

/**
 * Handles all Instance lifecycle, exposes instance's HTTP API.
 */
export class CSIController extends TypedEmitter<Events> {
    id: string;

    private instanceLifetimeExtensionDelay: number;

    private keepAliveRequested?: boolean;
    private _lastStats?: MonitoringMessageData;

    get lastStats(): InstanceStats {
        return {
            limits: {
                memory: (this._lastStats?.limit! / (1024 * 1024)) as InstanceLimits["memory"],
            },
            current: {
                memory: this._lastStats?.memoryUsage
            }
        };
    }

    sthConfig: STHConfiguration;
    limits: InstanceLimits = {};
    sequence: SequenceInfo;
    appConfig: AppConfig;
    instancePromise?: Promise<{ exitcode: number, reason: TerminateReason }>;
    sequenceArgs: Array<any> | undefined;
    controlDataStream?: DataStream;
    router?: APIRoute;
    info: {
        ports?: any;
        created?: Date;
        started?: Date;
        ended?: Date;
    } = {};
    status: InstanceStatus;
    terminated?: {
        exitcode: number,
        reason: string
    }
    provides?: string;
    requires?: string;

    initResolver?: { res: Function, rej: Function };
    heartBeatResolver?: { res: Function, rej: Function };
    heartBeatPromise?: Promise<string>;

    heartBeatTicker?: NodeJS.Timeout;
    logMux?: PassThrough;

    apiOutput = new PassThrough();
    apiInputEnabled = true;

    /**
     * Topic to which the output stream should be routed
     */
    public outputTopic?: string

    /**
     * Topic to which the input stream should be routed
     */
    public inputTopic?: string

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
        sthConfig: STHConfiguration
    ) {
        super();

        this.id = id;
        this.sequence = sequence;
        this.appConfig = payload.appConfig;
        this.sthConfig = sthConfig;
        this.sequenceArgs = payload.args;
        this.outputTopic = payload.outputTopic;
        this.inputTopic = payload.inputTopic;

        this.limits = {
            memory: payload.limits?.memory || sthConfig.docker.runner.maxMem
        };

        this.instanceLifetimeExtensionDelay = +sthConfig.timings.instanceLifetimeExtensionDelay;
        this.communicationHandler = communicationHandler;

        this.logger = new ObjLogger(`CSIC ${this.id.slice(0, 7)}-...`, { id: this.id });

        this.logger.debug("Constructor executed");
        this.info.created = new Date();
        this.status = "initializing";
    }

    async start() {
        const i = new Promise((res, rej) => {
            this.initResolver = { res, rej };
            this.startInstance();
        });

        i.then(() => this.main()).catch(e => {
            this.logger.info("Instance status: errored", e);
            this.status = "errored";
            this.emit("error", e);
        });

        return i;
    }

    async main() {
        this.status = "running";
        this.logger.trace("Instance started");

        let code = 0;
        let errored = false;

        try {
            const stopResult = await this.instanceStopped();

            code = stopResult?.exitcode!;
            this.logger.trace("Instance ended with code", code);
            this.setExitInfo(code, stopResult?.reason!);
        } catch (e: any) {
            this.setExitInfo(e.exitcode, e.reason);
            code = e.exitcode;
            errored = true;
            this.logger.error("Instance caused error", e.message, code);
        }

        this.status = !errored ? "completed" : "errored";

        this.info.ended = new Date();

        this.logger.trace("Finalizing...");

        await this.finalize();

        this.emit("end", code);
        // removed log close from here - should be done in cleanup in GC.
    }

    startInstance() {
        this._instanceAdapter = getInstanceAdapter(this.sthConfig);
        this._instanceAdapter.logger.pipe(this.logger, { end: false });

        const instanceConfig: InstanceConfig = {
            ...this.sequence.config,
            limits: this.limits,
            instanceAdapterExitDelay: this.sthConfig.timings.instanceAdapterExitDelay
        };

        const instanceMain = async () => {
            try {
                this.status = "starting";

                await this.instanceAdapter.init();

                this.logger.trace("Streams hooked and routed");

                this.endOfSequence = this.instanceAdapter.run(
                    instanceConfig,
                    this.sthConfig.host.instancesServerPort,
                    this.id);

                this.logger.trace("Sequence initialized");

                const exitcode = await this.endOfSequence;

                if (exitcode > 0) {
                    this.status = "errored";
                    this.logger.error("Crashlog", await this.instanceAdapter.getCrashLog());
                }

                await this.cleanup();

                return exitcode;
            } catch (error: any) {
                this.status = "errored";
                this.logger.error("Error caught", error.stack);

                await this.cleanup();

                return 213;
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

    private mapRunnerExitCode(exitcode: number) {
        // eslint-disable-next-line default-case
        switch (exitcode) {
            case RunnerExitCode.INVALID_ENV_VARS: {
                return Promise.reject({
                    message: "Runner was started with invalid configuration. This is probably a bug in STH.",
                    exitcode: RunnerExitCode.INVALID_ENV_VARS
                });
            }
            case RunnerExitCode.INVALID_SEQUENCE_PATH: {
                return Promise.reject({
                    message: `Sequence entrypoint path ${this.sequence.config.entrypointPath} is invalid. ` +
                    "Check `main` field in Sequence package.json",
                    exitcode: RunnerExitCode.INVALID_SEQUENCE_PATH });
            }
            case RunnerExitCode.SEQUENCE_FAILED_ON_START: {
                return Promise.reject({
                    message: "Sequence failed on start", exitcode: RunnerExitCode.SEQUENCE_FAILED_ON_START
                });
            }
            case RunnerExitCode.SEQUENCE_UNPACK_FAILED: {
                return Promise.reject({
                    message: "Sequence unpack failed", exitcode: RunnerExitCode.SEQUENCE_UNPACK_FAILED
                });
            }
            case RunnerExitCode.KILLED: {
                return Promise.resolve({
                    message: "Instance killed", exitcode: RunnerExitCode.KILLED, reason: TerminateReason.KILLED
                });
            }
            case RunnerExitCode.STOPPED: {
                return Promise.resolve({
                    message: "Instance stopped", exitcode: RunnerExitCode.STOPPED, reason: TerminateReason.STOPPED
                });
            }
        }

        if (exitcode > 0) {
            return Promise.reject({ message: "Runner failed", exitcode });
        }

        return Promise.resolve({ exitcode });
    }

    async cleanup() {
        await this.instanceAdapter.cleanup();

        this.logger.info("Cleanup completed");
    }

    get isRunning() { return !this.finalizingPromise; }

    async finalize() {
        await defer(runnerExitDelay);

        this.logger.debug(`Extended CSICLifetime: ${this.instanceLifetimeExtensionDelay}ms`);
        this.finalizingPromise = cancellableDefer(this.instanceLifetimeExtensionDelay);

        await this.finalizingPromise;

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
            const pangData = message[1];

            if (pangData.provides) {
                this.provides ||= pangData.provides;
            } else if (pangData.requires) {
                this.requires ||= pangData.requires;

                if (pangData.requires !== "") {
                    this.apiInputEnabled = false;
                }
            }

            this.emit("pang", message[1]);
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
                args: this.sequenceArgs
            };

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

        let inputHeadersSent = false;

        this.router.downstream("/input", (req) => {
            if (this.apiInputEnabled) {
                const stream = this.downStreams![CC.IN];
                const contentType = req.headers["content-type"];

                // @TODO: Check if subsequent requests have the same content-type.
                if (!inputHeadersSent) {
                    if (contentType === undefined) {
                        throw new Error("Content-Type must be defined");
                    }

                    stream.write(`Content-Type: ${contentType}\r\n`);
                    stream.write("\r\n");

                    inputHeadersSent = true;
                }

                return stream;
            }

            return { opStatus: 406, error: "Input provided in other way." };
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
        const message = (req.body || []) as EncodedMessage<RunnerMessageCode.STOP>;

        if (!isStopSequenceMessage(message[1] || {})) {
            return { opStatus: ReasonPhrases.BAD_REQUEST };
        }

        this.status = "stopping";

        await this.communicationHandler.sendControlMessage(...message);

        const [, { timeout }] = message;

        this.keepAliveRequested = false;

        await defer(timeout || 0);

        if (!this.keepAliveRequested) {
            // TODO: shouldn't this be just this.handleKill();
            await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});
        }

        return { opStatus: ReasonPhrases.ACCEPTED, ...this.getInfo() };
    }

    private async handleKill(req: ParsedMessage): Promise<OpResponse<STHRestAPI.SendKillInstanceResponse>> {
        if (this.status === "killing") {
            await this.instanceAdapter.remove();
        }
        this.status = "killing";

        await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});

        // This will be resolved after HTTP response. It's not awaited on purpose
        promiseTimeout(this.endOfSequence, runnerExitDelay)
            .catch(() => this.instanceAdapter.remove());

        try {
            const message = req.body as EncodedMessage<RunnerMessageCode.KILL>;

            if (message[1].removeImmediately) {
                this.instanceLifetimeExtensionDelay = 0;

                if (this.finalizingPromise) {
                    this.finalizingPromise.cancel();
                }
            }
        } catch (e) {
            this.logger.warn("Failed to parse KILL message", e);
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
            sequenceArgs: this.sequenceArgs,
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
            if (this.instancePromise)
                await promiseTimeout(this.instancePromise, runnerExitDelay);

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

    setExitInfo(exitcode: number, reason: TerminateReason) {
        this.terminated ||= { exitcode, reason };
    }
}
