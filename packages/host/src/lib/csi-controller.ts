import { getRouter } from "@scramjet/api-server";
import {
    AppError,
    CommunicationHandler, CSIControllerError,
    MessageUtilities
} from "@scramjet/model";
import { CommunicationChannel as CC, CommunicationChannel, RunnerMessageCode, SupervisorMessageCode } from "@scramjet/symbols";
import {
    APIRoute, AppConfig, DownstreamStreamsConfig, ExitCode, FunctionDefinition, HandshakeAcknowledgeMessage,
    InstanceConfigMessage, Logger, PassThroughStreamsConfig
} from "@scramjet/types";
import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import { resolve as resolvePath } from "path";
import { DataStream } from "scramjet";
import { PassThrough } from "stream";
import { development } from "@scramjet/sth-config";
import { Sequence } from "./sequence";

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

    communicationHandler: CommunicationHandler;
    logger: Logger;

    constructor(
        id: string,
        sequence: Sequence,
        appConfig: AppConfig,
        sequenceArgs: any[] | undefined,
        communicationHandler: CommunicationHandler,
        logger: Logger
    ) {
        super();

        this.id = id;
        this.sequence = sequence;
        this.appConfig = appConfig;
        this.sequenceArgs = sequenceArgs;
        this.logger = logger;
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

        try {
            const code = await this.supervisorStopped();

            this.logger.log("Supervisor stopped.");
            this.emit("end", code);
        } catch (e) {
            this.logger.error(e);
        }
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
        const command: string[] = [path, this.id];

        this.superVisorProcess = spawn(executable, command);

        // TODO: remove
        // this.superVisorProcess.stdout?.pipe(process.stdout);
        // this.superVisorProcess.stderr?.pipe(process.stderr);
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
                this.logger.error("Supervisor process " + superVisorProcess.pid + " threw an error: " + error);

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
        } catch (e) {
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
            router.downstream("/input", this.upStreams[CommunicationChannel.IN], { end: true });

            // monitoring data
            router.get("/health", RunnerMessageCode.MONITORING, this.communicationHandler);
            router.get("/status", RunnerMessageCode.STATUS, this.communicationHandler);
            router.get("/event", RunnerMessageCode.EVENT, this.communicationHandler);

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
}
