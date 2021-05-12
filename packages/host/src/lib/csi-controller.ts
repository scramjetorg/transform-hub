import { HandshakeAcknowledgeMessage, MessageUtilities, CSIControllerError, CommunicationHandler } from "@scramjet/model";
import { RunnerMessageCode, CommunicationChannel as CC } from "@scramjet/symbols";
import { AppConfig, DownstreamStreamsConfig, ExitCode, Logger } from "@scramjet/types";

import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import { resolve as resolvePath } from "path";
import { DataStream } from "scramjet";

export class CSIController extends EventEmitter {
    id: string;
    appConfig: AppConfig;
    superVisorProcess?: ChildProcess;
    sequenceArgs: Array<string> | undefined;

    controlDataStream?: DataStream;
    downStreams?: DownstreamStreamsConfig;

    communicationHandler: CommunicationHandler;
    logger: Logger;

    constructor(
        id: string,
        appConfig: AppConfig,
        args: any[] | undefined,
        communicationHandler: CommunicationHandler,
        logger: Logger
    ) {
        super();

        this.id = id;
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
        this.downStreams = streams;

        this.controlDataStream = new DataStream();
        this.controlDataStream.JSONStringify()
            .pipe(this.downStreams[CC.CONTROL]);

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.PING, async () => {
            await this.handleHandshake();

            return null;
        });
    }

    async handleHandshake() {
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

    handleSupervisorConnect(streams: DownstreamStreamsConfig) {
        this.hookupStreams(streams);
    }
}
