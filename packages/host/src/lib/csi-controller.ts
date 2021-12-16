import {
    APIRoute,
    AppConfig,
    CSIConfig,
    DownstreamStreamsConfig,
    EncodedMessage,
    ExitCode,
    HandshakeAcknowledgeMessage,
    ICommunicationHandler,
    Logger,
    ParsedMessage,
    PassThroughStreamsConfig,
    ReadableStream,
    SequenceInfo,
    WritableStream,
    InstanceConifg,
    ILifeCycleAdapterRun
} from "@scramjet/types";
import {
    AppError,
    CSIControllerError,
    CommunicationHandler,
    HostError,
    MessageUtilities,
    SupervisorError
} from "@scramjet/model";
import { CommunicationChannel as CC, CommunicationChannel, RunnerMessageCode } from "@scramjet/symbols";
import { PassThrough, Readable } from "stream";
import { development } from "@scramjet/sth-config";

import { DataStream } from "scramjet";
import { EventEmitter } from "events";
import { ServerResponse } from "http";
import { getLogger } from "@scramjet/logger";
import { getRouter } from "@scramjet/api-server";

import { getInstanceAdapter } from "@scramjet/adapters";
import { defer, promiseTimeout } from "@scramjet/utility";

const stopTimeout = 7000;

export class CSIController extends EventEmitter {
    /**
     * @param id Supervisor id, this id is generated in the host and passed to Supervisor at its initiation.
     */
         id: string;

         logger: Logger;

         _endOfSequence?: Promise<number>;

         get endOfSequence(): Promise<number> {
             if (!this._endOfSequence) {
                 throw new SupervisorError("RUNNER_NOT_STARTED");
             }

             return this._endOfSequence;
         }

         set endOfSequence(prm: Promise<number>) {
             this._endOfSequence = prm;
         }

         private keepAliveRequested?: boolean;
    config: CSIConfig;
    sequence: SequenceInfo;
    appConfig: AppConfig;
    superVisorPromise?: Promise<void>;
    sequenceArgs: Array<any> | undefined;
    controlDataStream?: DataStream;
    router?: APIRoute;
    info: {
        ports?: any,
        created?: Date,
        started?: Date
    } = {};
    provides?: string;
    requires?: string;
    initResolver?: { res: Function, rej: Function };
    startResolver?: { res: Function, rej: Function };
    startPromise: Promise<void>;

    apiOutput = new PassThrough();
    apiInputEnabled = true;

    private _instanceAdapter?: ILifeCycleAdapterRun;

    get instanceAdapter(): ILifeCycleAdapterRun {
        if (!this._instanceAdapter) {
            throw new Error("Instance adapter uninitialized");
        }

        return this._instanceAdapter;
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
        appConfig: AppConfig,
        sequenceArgs: any[] | undefined,
        communicationHandler: CommunicationHandler,
        csiConfig: CSIConfig
    ) {
        super();

        this.id = id;
        this.sequence = sequence;
        this.appConfig = appConfig;
        this.config = csiConfig;
        this.sequenceArgs = sequenceArgs;
        this.logger = getLogger(this);
        this.communicationHandler = communicationHandler;

        this.startPromise = new Promise((res, rej) => {
            this.startResolver = { res, rej };
        });

        this.info.created = new Date();
    }

    async start() {
        const i = new Promise((res, rej) => {
            this.initResolver = { res, rej };
            this.startSupervisor();
        });

        i.then(() => this.main()).catch(e => {
            this.emit("error", e);
        });

        return i;
    }

    async main() {
        this.logger.log("Supervisor started.");
        let code = 0;

        try {
            code = await this.supervisorStopped();

            this.logger.log("Supervisor stopped.");
        } catch (e: any) {
            code = e;
            this.logger.error("Supervisior caused error, code:", e);
        }

        this.emit("end", code);
    }

    startSupervisor() {
        this._instanceAdapter = getInstanceAdapter(this.config.noDocker);

        const instanceConfig: InstanceConifg = {
            ...this.sequence.config,
            instanceAdapterExitDelay: this.config.instanceAdapterExitDelay
        };

        const instanceMain = async () => {
            try {
                await this.instanceAdapter.init();

                this.logger.log("Streams hooked and routed.");

                this.endOfSequence = this.instanceAdapter.run(instanceConfig, this.config.instancesServerPort, this.id);

                this.logger.info("Sequence initialized.");

                const exitcode = await this.endOfSequence;

                // TODO: if we have a non-zero exit code is this expected?
                this.logger.log(`Sequence finished with status: ${exitcode}`);
            } catch (error: any) {
                this.logger.error("Error caught", error.stack);

                const makeSnapshotOnError = false;

                /**
                * Container snapshot is made if it was requested in LifeCycleConfig
                */
                if (makeSnapshotOnError) {
                    const retUrl = await this.instanceAdapter.snapshot();

                    // TODO: we should mute this in the stream from Runner -
                    //       Runner should not be able to send this (and probably other codes)
                    /**
                * The message about the successful snapshot creation and its URL is sent to the CSH.
                */
                    this.communicationHandler.addMonitoringHandler(RunnerMessageCode.SNAPSHOT_RESPONSE,
                        () => [RunnerMessageCode.SNAPSHOT_RESPONSE, { url: retUrl }]);
                }

                await this.instanceAdapter.cleanup();

                this.logger.error("Cleanup done (post error).");

                return;
            }

            /**
        * LifeCycle Adapter Run performs cleanup operations.
        * The cleanup operations depend on the LifeCycle interface implementation.
        * They can include, for example, the removal of the created volume, directory, and container.
        */
            await this.instanceAdapter.cleanup();

            this.logger.info("Cleanup done (normal execution).");
        };

        // @TODO remember about passing out and err to process.stdio
        this.superVisorPromise = instanceMain();
    }

    supervisorStopped(): Promise<ExitCode> {
        if (!this.superVisorPromise) throw new CSIControllerError("UNATTACHED_STREAMS");

        return this.superVisorPromise
            .then(() => 0)
            .catch((error) => {
                const exitCode = error?.data?.exitCode ?? 10;

                if (exitCode !== 0) {
                    throw new Error(`Supervisior returned non-zero code: ${exitCode}`);
                }

                return exitCode;
            });
    }

    hookupStreams(streams: DownstreamStreamsConfig) {
        this.logger.log("Hookup streams.");

        this.downStreams = streams;

        const [stdin, stdout, stderr] = this.instanceAdapter.getStdio();

        const streamConfig: PassThroughStreamsConfig = [
            new PassThrough(), // this should be e2e encrypted
            new PassThrough(), // this should be e2e encrypted
            new PassThrough(), // this should be e2e encrypted
            new PassThrough(), // control
            new PassThrough(), // monitor
            new PassThrough(), // this should be e2e encrypted
            new PassThrough(), // this should be e2e encrypted
            new PassThrough() // this should be e2e encrypted (LOG FILE)
        ];

        this.upStreams = streamConfig as PassThroughStreamsConfig;

        this.upStreams[CC.STDIN].pipe(stdin.on("error", (err) => {
            this.logger.error("STDIN", err);
        }));
        stdout.on("error", (err) => {
            this.logger.error("STDOUT", err);
        }).pipe(this.upStreams[CC.STDOUT]);
        stderr.on("error", (err) => {
            this.logger.error("STDERR", err);
        }).pipe(this.upStreams[CC.STDERR]);

        // Up Stream 1 errors: write after end
        this.upStreams.forEach((stream, i) => stream?.on("error", () => {
            this.logger.error(`===  UP ERRORR in stream ${i}`);
        }));

        this.downStreams.forEach((stream, i) => stream?.on("error", () => {
            this.logger.error(`===  DOWN ERRORR in stream ${i}`);
        }));

        this.upStreams[CC.OUT].on("close", () => {
            this.logger.log("==== OUTPUT CLOSE UPSTREAM");
        });

        this.downStreams[CC.OUT].on("close", () => {
            this.logger.log("==== OUTPUT CLOSE DOWNSTREAM");
        });

        this.upStreams[CC.IN].on("close", () => {
            this.logger.log("==== INPUT CLOSE UPSTREAM");
        });

        this.downStreams[CC.IN].on("close", () => {
            this.logger.log("==== INPUT CLOSE DOWNSTREAM");
        });

        this.communicationHandler.hookUpstreamStreams(this.upStreams);
        this.communicationHandler.hookDownstreamStreams(this.downStreams);

        this.communicationHandler.pipeStdio();
        this.communicationHandler.pipeMessageStreams();
        this.communicationHandler.pipeDataStreams();

        // TODO: remove
        if (development()) this.upStreams[CommunicationChannel.LOG].pipe(process.stdout);
        // if (development()) this.upStreams[CommunicationChannel.MONITORING].pipe(process.stdout);

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
            message[1] = await this.instanceAdapter.stats(message[1]);
            return message;
        }, true);

        /**
             * When the kill message comes from the CSH via the control stream
             * and the Sequence has not terminated yet, the LifeCycle Controller
             * requests LifeCycle Adapter Run to kill the Sequence by executing kill
             * method on its interface.
             */
        this.communicationHandler.addControlHandler(
            RunnerMessageCode.KILL,
            (message) => this.handleKillCommand(message)
        );

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

        /*
            * When the stop message comes from the CSH via the control stream
            * and the Sequence has not terminated yet, the LifeCycle Controller
            * requests LifeCycle Adapter Run to stop the Sequence by executing stop with parameters:
            * * timeout: number - the Sequence will be stopped after the provided timeout (milliseconds)
            * * canCallKeepalive: boolean - indicates whether Sequence can prolong operation to complete the task
            */
        this.communicationHandler.addControlHandler(
            RunnerMessageCode.STOP,
            async message => this.handleStop(message)
        );

        this.upStreams[CC.MONITORING].resume();
    }

    async handleHandshake(message: EncodedMessage<RunnerMessageCode.PING>) {
        this.logger.log("PING RECEIVED", message);

        if (!message[1].ports) {
            this.logger.warn("Received a PING message but didn't receive ports config");
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

        this.startResolver?.res();

        this.info.started = new Date();
    }

    async handleSupervisorConnect(streams: DownstreamStreamsConfig) {
        try {
            this.hookupStreams(streams);
            this.createInstanceAPIRouter();

            this.initResolver?.res();
        } catch (e: any) {
            this.initResolver?.rej(e);
        }
    }

    createInstanceAPIRouter() {
        if (this.upStreams) {
            this.router = getRouter();

            this.router.get("/", () => {
                return this.getInfo();
            });

            this.router.upstream("/stdout", this.upStreams[CommunicationChannel.STDOUT]);
            this.router.upstream("/stderr", this.upStreams[CommunicationChannel.STDERR]);
            this.router.downstream("/stdin", this.upStreams[CommunicationChannel.STDIN], { end: true });

            this.router.upstream("/log", this.upStreams[CommunicationChannel.LOG]);

            if (development()) {
                this.router.upstream("/monitoring", this.upStreams[CommunicationChannel.MONITORING]);
            }

            this.router.upstream("/output", this.upStreams[CommunicationChannel.OUT]);
            this.router.downstream("/input", (req) => {
                if (this.apiInputEnabled) {
                    const stream = this.downStreams![CommunicationChannel.IN];
                    const contentType = req.headers["content-type"];

                    if (contentType === undefined) {
                        throw new Error("Content-Type must be defined");
                    }

                    stream.write(`Content-Type: ${contentType}\r\n`);
                    stream.write("\r\n");
                    return stream;
                }

                return { opStatus: 406, error: "Input provided in other way." };
            }, { checkContentType: false, end: true, encoding: "utf-8" });

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

                this.logger.debug(`Event stream "${name}" connected.`);
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
                if (req.params?.name && localEmitter.lastEvents[req.params?.name]) {
                    return localEmitter.lastEvents[req.params?.name];
                }

                return awaitEvent(req);
            });
            this.router.get("/once/:name", awaitEvent);

            // operations
            this.router.op("post", "/_monitoring_rate", RunnerMessageCode.MONITORING_RATE, this.communicationHandler);
            this.router.op("post", "/_event", RunnerMessageCode.EVENT, this.communicationHandler);
            this.router.op("post", "/_stop", RunnerMessageCode.STOP, this.communicationHandler);
            this.router.op("post", "/_kill", RunnerMessageCode.KILL, this.communicationHandler);
        } else {
            throw new AppError("UNATTACHED_STREAMS");
        }
    }

    async getInfo() {
        await this.startPromise;

        return {
            ...this.info,
            sequenceId: this.sequence.id,
            appConfig: this.appConfig,
            args: this.sequenceArgs
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

    async confirmInputHook(): Promise<void> {
        await this.controlDataStream?.whenWrote(
            [RunnerMessageCode.INPUT_CONTENT_TYPE, { connected: true }]
        );
    }

    // TODO: move to HostOne
    async handleSequenceCompleted(message: EncodedMessage<RunnerMessageCode.SEQUENCE_COMPLETED>) {
        this.logger.log("Got message: SEQUENCE_COMPLETED.");

        // TODO: we are ready to ask Runner to exit.
        // TODO: this needs to send a STOP request with canKeepAlive and timeout.
        //       host would get those in `create` request.
        await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});

        try {
            await promiseTimeout(this.endOfSequence, stopTimeout);
            this.logger.log("Sequence terminated itself.");
        } catch {
            await this.instanceAdapter.remove();
            this.logger.log("Sequence doesn't terminated itself in expected time (%s).", stopTimeout);
            process.exitCode = 252;
        }

        return message;
    }

    // TODO: move this to Host like handleSequenceCompleted.
    async handleSequenceStopped(message: EncodedMessage<RunnerMessageCode.SEQUENCE_STOPPED>) {
        this.logger.log("Got sequence end message, sending kill");

        try {
            await promiseTimeout(this.endOfSequence, stopTimeout);
            this.logger.log("Sequence terminated itself.");
        } catch {
            this.logger.warn("Sequence failed to terminate within timeout, sending kill...");
            await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});

            try {
                await promiseTimeout(this.endOfSequence, stopTimeout);
                this.logger.log("Terminated with kill.");
            } catch {
                this.logger.error("Sequence unresponsive, killing container...");
                await this.instanceAdapter.remove();
                process.exitCode = 253;
            }
        }

        return message;
    }

    // TODO: move this to host (it's needed for both Stop and Complete signals)
    handleKeepAliveCommand(message: EncodedMessage<RunnerMessageCode.ALIVE>) {
        this.logger.log("Got keep-alive message from sequence");
        this.keepAliveRequested = true;

        return message;
    }

    private async kill() {
        await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});
    }

    private async handleKillCommand(message: EncodedMessage<RunnerMessageCode.KILL>) {
        // wait for this before cleanups
        // handle errors there
        await promiseTimeout(this.endOfSequence, stopTimeout)
            .catch(() => this.instanceAdapter.remove());

        return message;
    }

    // TODO: if we can keep alive we should not hold this promise unresolved
    // TODO: we need some safeExec method for asynchronous handling of such cases
    //       an error here should send an "error" event, but not block the channel
    private async handleStop(message: EncodedMessage<RunnerMessageCode.STOP>):
        Promise<EncodedMessage<RunnerMessageCode.STOP>> {
        const [, { timeout }] = message;

        this.keepAliveRequested = false;

        await defer(timeout);

        if (!this.keepAliveRequested) {
            await this.kill();
        }

        return message;
    }
}
