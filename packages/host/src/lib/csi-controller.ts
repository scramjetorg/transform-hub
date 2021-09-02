import { getRouter } from "@scramjet/api-server";
import {
    AppError,
    CommunicationHandler, CSIControllerError,
    HostError,
    MessageUtilities
} from "@scramjet/model";
import { CommunicationChannel as CC, CommunicationChannel, RunnerMessageCode, SupervisorMessageCode } from "@scramjet/symbols";
import {
    APIRoute, AppConfig, DownstreamStreamsConfig, EventMessageData, ExitCode,
    FunctionDefinition, HandshakeAcknowledgeMessage, ICommunicationHandler,
    InstanceConfigMessage, Logger, ParsedMessage, PassThroughStreamsConfig, ReadableStream, WritableStream
} from "@scramjet/types";
import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import { resolve as resolvePath } from "path";
import { DataStream } from "scramjet";
import { PassThrough } from "stream";
import { configService, development } from "@scramjet/sth-config";
import { Sequence } from "./sequence";
import { ServerResponse } from "http";
import { getLogger } from "@scramjet/logger";

export class CSIController extends EventEmitter {
    id: string;
    sequence: Sequence;
    appConfig: AppConfig;
    superVisorProcess?: ChildProcess;
    sequenceArgs: Array<any> | undefined;
    status?: FunctionDefinition[];
    controlDataStream?: DataStream;
    router?: APIRoute;
    info: {
        ports?: any,
        created?: Date,
        started?: Date
    } = {};
    initResolver?: { res: Function, rej: Function };
    startResolver?: { res: Function, rej: Function };
    startPromise: Promise<void>;

    /**
     * Streams connected do API.
     */
    private downStreams?: DownstreamStreamsConfig;
    private upStreams?: PassThroughStreamsConfig;

    communicationHandler: ICommunicationHandler;
    logger: Logger;
    private socketServerPath: string;

    constructor(
        id: string,
        sequence: Sequence,
        appConfig: AppConfig,
        sequenceArgs: any[] | undefined,
        communicationHandler: CommunicationHandler
    ) {
        super();

        this.id = id;
        this.sequence = sequence;
        this.appConfig = appConfig;
        this.sequenceArgs = sequenceArgs;
        this.logger = getLogger(this);
        this.communicationHandler = communicationHandler;
        this.socketServerPath = configService.getConfig().host.socketPath;

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
        // eslint-disable-next-line no-extra-parens
        const isTSNode = !!(process as any)[Symbol.for("ts-node.register.instance")];
        const supervisorPath = require.resolve("@scramjet/supervisor");

        let executable = process.execPath;

        if (isTSNode) {
            executable = "ts-node";
        }

        const path = resolvePath(__dirname, supervisorPath);
        const command: string[] = [path, this.id, this.socketServerPath];

        this.superVisorProcess = spawn(executable, command);

        this.logger.info("Spawning supervisor with command:", command);

        // TODO: remove
        if (development()) {
            this.superVisorProcess.stdout?.pipe(process.stdout);
            this.superVisorProcess.stderr?.pipe(process.stderr);
        }
    }

    supervisorStopped(): Promise<ExitCode> {
        const superVisorProcess = this.superVisorProcess;

        if (!superVisorProcess) throw new CSIControllerError("UNATTACHED_STREAMS");

        return new Promise((resolve, reject) => {
            superVisorProcess.on("exit", (code: any, signal: any) => {
                this.logger.log("Supervisor process exited with code: " + code + ", signal: " + signal);

                if (code === 0) {
                    resolve(0);
                } else {
                    reject(code);
                }
            });

            superVisorProcess.on("error", (error) => {
                this.logger.error("Supervisor process " + superVisorProcess.pid + " threw an error: ", error);

                reject(error);
            });
        });
    }

    hookupStreams(streams: DownstreamStreamsConfig) {
        this.logger.log("Hookup streams.");

        this.downStreams = streams;

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

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.PING, async (message: any) => {
            await this.handleHandshake(message);

            return null;
        });

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.PANG, async (message: any) => {
            this.emit("pang", message[1]);
        });

        this.upStreams[CC.MONITORING].resume();
    }

    async handleHandshake(message: any) {
        this.logger.log("PING RECEIVED", message);

        Object.assign(this.info, message[1]);

        if (this.controlDataStream) {
            const pongMsg: HandshakeAcknowledgeMessage = {
                msgCode: RunnerMessageCode.PONG,
                appConfig: this.appConfig,
                args: this.sequenceArgs
            };

            await this.controlDataStream.whenWrote(MessageUtilities.serializeMessage<RunnerMessageCode.PONG>(pongMsg));

            this.startResolver?.res();

            this.info.started = new Date();
            //this.emit("start", this.sequence);
        } else {
            throw new CSIControllerError("UNINITIALIZED_STREAM", "control");
        }
    }

    async sendConfig() {
        const configMsg: InstanceConfigMessage = {
            msgCode: SupervisorMessageCode.CONFIG,
            config: this.sequence.config
        };

        await this.controlDataStream?.whenWrote(
            MessageUtilities.serializeMessage<SupervisorMessageCode.CONFIG>(configMsg)
        );
    }

    async handleSupervisorConnect(streams: DownstreamStreamsConfig) {
        try {
            this.hookupStreams(streams);
            this.createInstanceAPIRouter();
            await this.sendConfig();

            this.initResolver?.res();
        } catch (e: any) {
            this.initResolver?.rej(e);
        }
    }

    createInstanceAPIRouter() {
        if (this.upStreams) {
            const router = getRouter();

            router.get("/", () => {
                return this.getInfo();
            });

            router.upstream("/stdout", this.upStreams[CommunicationChannel.STDOUT]);
            router.upstream("/stderr", this.upStreams[CommunicationChannel.STDERR]);
            router.downstream("/stdin", this.upStreams[CommunicationChannel.STDIN], { end: true });

            router.upstream("/log", this.upStreams[CommunicationChannel.LOG]);

            router.upstream("/output", this.upStreams[CommunicationChannel.OUT]);

            router.downstream("/input", (req) => {
                const stream = this.upStreams![CommunicationChannel.IN];
                const contentType = req.headers["content-type"];

                if (contentType === undefined) {
                    throw new Error("Content-Type must be defined");
                }

                stream.write(`Content-Type: ${contentType}\r\n`);
                stream.write("\r\n");
                return stream;
            }, { checkContentType: false, end: true, encoding: "utf-8" });

            // monitoring data
            router.get("/health", RunnerMessageCode.MONITORING, this.communicationHandler);

            // We are not able to obtain all necessary information for this endpoint yet, disabling it for now
            // router.get("/status", RunnerMessageCode.STATUS, this.communicationHandler);

            const localEmitter = Object.assign(
                new EventEmitter(),
                { lastEvents: {} } as { lastEvents: { [evname: string]: any } }
            );

            this.communicationHandler.addMonitoringHandler(RunnerMessageCode.EVENT, (data) => {
                const event = data[1] as unknown as EventMessageData;

                if (!event.eventName) return;
                localEmitter.lastEvents[event.eventName] = event;
                localEmitter.emit(event.eventName, event);
            });

            router.upstream("/events/:name", async (req: ParsedMessage, res: ServerResponse) => {
                const name = req.params?.name;

                if (!name) throw new HostError("EVENT_NAME_MISSING");

                const out = new DataStream();
                const handler = (data: any) => res.write(data);
                const clean = () => {
                    this.logger.debug(`Event stream "${name}" disconnected`);
                    localEmitter.off(name, handler);
                };

                this.logger.debug(`Event stream "${name}" connected`);
                localEmitter.on(name, handler);
                res.on("error", clean);
                res.on("end", clean);

                return out.JSONStringify();
            });

            const awaitEvent = async (req: ParsedMessage): Promise<unknown> => new Promise(res => {
                const name = req.params?.name;

                if (!name)
                    throw new HostError("EVENT_NAME_MISSING");
                localEmitter.once(name, res);
            });

            router.get("/event/:name", async (req) => {
                if (req.params?.name && localEmitter.lastEvents[req.params?.name])
                    return localEmitter.lastEvents[req.params?.name];
                return awaitEvent(req);
            });
            router.get("/once/:name", awaitEvent);

            // operations
            router.op("post", "/_monitoring_rate", RunnerMessageCode.MONITORING_RATE, this.communicationHandler);
            router.op("post", "/_event", RunnerMessageCode.EVENT, this.communicationHandler);
            router.op("post", "/_stop", RunnerMessageCode.STOP, this.communicationHandler);
            router.op("post", "/_kill", RunnerMessageCode.KILL, this.communicationHandler);

            this.router = router;
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

    getOutputStream(): ReadableStream<any> | undefined {
        if (this.downStreams && this.downStreams[CC.OUT]) {
            return this.downStreams[CC.OUT];
        }

        return undefined;
    }

    getInputStream(): WritableStream<any> | undefined {
        if (this.downStreams && this.downStreams[CC.IN]) {
            return this.downStreams[CC.IN];
        }

        return undefined;
    }

    async confirmInputHook(): Promise<void> {
        await this.controlDataStream?.whenWrote(
            [RunnerMessageCode.INPUT_CONTENT_TYPE, { connected: true }]
        );
    }
}
