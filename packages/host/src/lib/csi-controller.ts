import {
    CommunicationHandler, CSIControllerError, HandshakeAcknowledgeMessage, InstanceConfigMessage,
    MessageUtilities
} from "@scramjet/model";
import { CommunicationChannel as CC, CommunicationChannel, RunnerMessageCode, SupervisorMessageCode } from "@scramjet/symbols";
import { AppConfig, DownstreamStreamsConfig, ExitCode, FunctionDefinition, Logger } from "@scramjet/types";
import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import { IncomingMessage, ServerResponse } from "node:http";
import { resolve as resolvePath } from "path";
import { DataStream } from "scramjet";
import { PassThrough } from "stream";
import { Sequence } from "./host";

export class CSIController extends EventEmitter {
    id: string;
    sequence: Sequence;
    appConfig: AppConfig;
    superVisorProcess?: ChildProcess;
    sequenceArgs: Array<string> | undefined;
    status?: FunctionDefinition[];
    controlDataStream?: DataStream;
    downStreams?: DownstreamStreamsConfig;

    /**
     * Streams connected do API.
     */
    private upStreams?: UpstreamStreamsConfig;

    communicationHandler: CommunicationHandler;
    logger: Logger;

    constructor(
        id: string,
        sequence: Sequence,
        appConfig: AppConfig,
        args: any[] | undefined,
        communicationHandler: CommunicationHandler,
        logger: Logger
    ) {
        super();

        this.id = id;
        this.sequence = sequence;
        this.appConfig = appConfig;
        this.logger = logger;
        this.communicationHandler = communicationHandler;
    }

    async main() {
        this.startSupervisor();
        this.logger.log("Supervisor started");

        try {
            await this.supervisorStopped();
            this.logger.log("Supervisor stopped");
        } catch (e) {
            this.logger.error(e);
        }
    }

    startSupervisor() {
        // eslint-disable-next-line no-extra-parens
        const isTSNode = !!(process as any)[Symbol.for("ts-node.register.instance")];

        let supervisorPath = "../../../dist/supervisor/bin/supervisor.js";
        let executable = process.execPath;

        if (isTSNode) {
            supervisorPath = "../../../supervisor/src/bin/supervisor.ts";
            executable = "ts-node";
        }

        const path = resolvePath(__dirname, supervisorPath);
        const command: string[] = [path, this.id];

        this.superVisorProcess = spawn(executable, command);

        this.superVisorProcess.stdout?.pipe(process.stdout);
        this.superVisorProcess.stderr?.pipe(process.stderr);
    }

    supervisorStopped(): Promise<ExitCode> {
        return new Promise((resolve, reject) => {
            this.superVisorProcess?.on("exit", (code: any, signal: any) => {
                this.logger.log("Supervisor process exited with code: " + code + ", signal: " + signal);

                if (code === 0) {
                    resolve(0);
                } else {
                    reject(code);
                }
            });

            this.superVisorProcess?.on("error", (error) => {
                this.logger.error("Supervisor process " + this.superVisorProcess?.pid + " threw an error: " + error);

                reject(error);
            });
        });
    }

    hookupStreams(streams: DownstreamStreamsConfig) {
        this.logger.log("Hookup streams.");
        this.downStreams = streams;

        this.upStreams = [
            process.stdin, // this should be e2e encrypted
            process.stdout, // this should be e2e encrypted
            process.stderr, // this should be e2e encrypted
            new PassThrough(), // control
            process.stdout, // monitor
            new PassThrough(), // this should be e2e encrypted
            process.stdout, // this should be e2e encrypted
            new PassThrough() // this should be e2e encrypted (LOG FILE)

        ];

        this.communicationHandler.hookUpstreamStreams(this.upStreams);
        this.communicationHandler.hookDownstreamStreams(this.downStreams);
        this.communicationHandler.pipeStdio();
        this.communicationHandler.pipeMessageStreams();
        this.communicationHandler.pipeDataStreams();

        this.upStreams[CommunicationChannel.LOG].pipe(process.stdout);

        const controlDataStream = new DataStream();

        controlDataStream
            .JSONStringify()
            .pipe(this.downStreams[CommunicationChannel.CONTROL]);

        this.controlDataStream = new DataStream();
        this.controlDataStream.JSONStringify()
            .pipe(this.downStreams[CC.CONTROL]);

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.PING, async () => {
            await this.handleHandshake();

            return null;
        });
    }

    async handleHandshake() {
        this.logger.log("PING RECEIVED");

        this.sequenceArgs = ["/package/data.json"];
        if (this.controlDataStream) {
            const pongMsg: HandshakeAcknowledgeMessage = {
                msgCode: RunnerMessageCode.PONG,
                appConfig: this.appConfig,
                arguments: this.sequenceArgs
            };

            await this.controlDataStream.whenWrote(MessageUtilities.serializeMessage<RunnerMessageCode.PONG>(pongMsg));
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
        this.hookupStreams(streams);


        await this.sendConfig();
    }

    // eslint-disable-next-line complexity
    lookup(req: IncomingMessage, res: ServerResponse) {
        if (this.downStreams === undefined) {
            res.statusCode = 500;
            res.end();
            return;
        }

        this.logger.log(`Instance ${this.id} processing request ${req.url}`);

        switch (req.url?.split("/").pop()) {
        case "logs":
            this.downStreams[CommunicationChannel.LOG].pipe(res);
            break;
        case "output":
            this.downStreams[CommunicationChannel.OUT].pipe(res);
            break;
        case "input":
            req.pipe(this.downStreams[CommunicationChannel.IN]);
            break;
        case "status":
            res.end(this.status);
            break;
        case "event":
            this.downStreams[CommunicationChannel.MONITORING].pipe(res);
            break;
        case "_monitoring_rate":
        case "_event":
        case "_stop":
        case "_kill":
            req.pipe(this.downStreams[CommunicationChannel.CONTROL]);
            break;
        default:
            res.statusCode = 404;
            res.end();
            break;
        }
    }
}
