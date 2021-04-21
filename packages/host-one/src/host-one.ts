import { CommunicationChannel, CommunicationHandler, HandshakeAcknowledgeMessage, HostError, MessageUtilities, RunnerMessageCode } from "@scramjet/model";
import { APIExpose, AppConfig, ReadableStream, DownstreamStreamsConfig, EncodedMonitoringMessage, UpstreamStreamsConfig, WritableStream, EncodedControlMessage, ICommunicationHandler, IComponent, Logger } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import { ReadStream } from "fs";
import * as os from "os";
import * as path from "path";
import { DataStream, StringStream } from "scramjet";
import { PassThrough, Readable, Writable } from "stream";
import { SocketServer } from "./lib/server";
import { startSupervisor } from "./lib/start-supervisor";
import { createServer } from "@scramjet/api-server";

//import * as vorpal from "vorpal";

export class HostOne implements IComponent {
    private socketName: string;

    private netServer?: SocketServer;

    private monitorDownStream?: ReadableStream<string>;

    private controlDownstream?: PassThrough;

    private downStreams?: DownstreamStreamsConfig;

    private upStreams?: UpstreamStreamsConfig;

    private controlDataStream?: DataStream;
    // @ts-ignore
    private configPath: string;
    // @ts-ignore
    private vorpal: any;

    private packageDownStream?: ReadStream;

    private stdInDownstream?: Writable;

    private stdOutDownstream?: Readable;

    private api?: APIExpose;

    private communicationHandler: ICommunicationHandler = new CommunicationHandler();

    private logHistory?: DataStream;

    logger: Logger;

    errors = {
        noParams: "No params provided. Type help to know more.",
        parsingError: "An error occurred during parsing monitoring message.",
        noImplement: "Method not implemented."
    }

    private appConfig: AppConfig = {};
    private sequenceArgs?: string[];

    constructor() {
        this.logger = getLogger(this);
        this.socketName = path.join(os.tmpdir(), process.pid.toString());
    }

    async main(): Promise<void> {
        await this.hookupMonitorStream();
        this.logger.log("Monitor stream hooked up");
        await this.createNetServer();
        this.logger.log("Creating net server");
        await startSupervisor(this.logger, this.socketName);
        this.logger.log("Creating net server");
        await this.createApiServer();
        this.logger.log("Creating API server");

        //this.vorpal = new vorpal();
        //this.controlStreamsCliHandler();
    }

    async init(packageStream: ReadStream, appConfig: AppConfig, sequenceArgs?: any[]) {
        this.packageDownStream = packageStream;
        this.appConfig = appConfig;
        this.sequenceArgs = sequenceArgs;
        this.controlDownstream = new PassThrough();
        this.controlDataStream = new DataStream();

        this.monitorDownStream = new PassThrough();
        this.stdInDownstream = new PassThrough();
        this.stdOutDownstream = new PassThrough();

        this.downStreams = [
            this.stdInDownstream,
            this.stdOutDownstream,
            new PassThrough(),
            this.controlDownstream,
            this.monitorDownStream,
            this.packageDownStream,
            new PassThrough(),
            new PassThrough(),
            new PassThrough()
        ];

        this.upStreams = [
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough()
        ];

        this.controlDataStream.JSONStringify()
            .pipe(this.upStreams[CommunicationChannel.CONTROL] as unknown as WritableStream<EncodedControlMessage>);

        this.communicationHandler.hookUpstreamStreams(this.upStreams);
        this.communicationHandler.hookDownstreamStreams(this.downStreams);
        this.communicationHandler.pipeStdio();
        this.communicationHandler.pipeMessageStreams();

        this.hookLogStream();

        //this.vorpal = new vorpal();
        //this.controlStreamsCliHandler();

        // TODO: pipe to api stream.
        this.upStreams[1].pipe(process.stdout);
    }

    hookLogStream() {
        if (this.upStreams && this.upStreams[CommunicationChannel.LOG]) {
            this.logHistory = StringStream
                .from(this.upStreams[CommunicationChannel.LOG] as unknown as Readable)
                .keep(1000); // TODO: config

            this.logHistory?.pipe(process.stdout);
        } else {
            throw new HostError("UNINITIALIZED_STREAM", "log");
        }
    }

    getAppConfig(configPath: string): AppConfig {
        return require(configPath);
    }

    async createNetServer(): Promise<void> {
        this.netServer = new SocketServer(this.socketName);

        this.netServer.attachStreams(this.downStreams);
        await this.netServer.start();

        process.on("beforeExit", () => {
            console.warn("beforeExit");
        });

        return Promise.resolve();
    }

    async createApiServer(): Promise<void> {
        const conf = {};
        const apiBase = "/api/v1";
        const {
            stdin,
            stderr,
            stdout
        } = this.communicationHandler.getStdio();

        this.api = createServer(conf);
        this.api.server.listen(8000).unref(); // add .unref() or server will keep process up

        /**
         * ToDo: GET
         * * /api/v1/stream/stdout/
         * * /api/v1/stream/stderr/
         */
        this.api.upstream(`${apiBase}/stream/stdout`, stdout);
        this.api.upstream(`${apiBase}/stream/stderr`, stderr);
        this.api.downstream(`${apiBase}/stream/stdin`, stdin);

        /**
         * ToDo: GET
         * * /api/v1/bash/log/
         */

        /**
         * ToDo: POST
         * * /api/v1/stream/stdin/
         */
        // this.api.downstream(`${apiBase}/stream/stdin`, {stream}, {commHandler})

        // monitoring data
        this.api.get(`${apiBase}/sequence/health`, RunnerMessageCode.MONITORING, this.communicationHandler);
        this.api.get(`${apiBase}/sequence/status`, RunnerMessageCode.STATUS, this.communicationHandler);
        this.api.op(`${apiBase}/sequence/_monitoring_rate/`, RunnerMessageCode.MONITORING_RATE, this.communicationHandler);
        this.api.op(`${apiBase}/sequence/_stop/`, RunnerMessageCode.STOP, this.communicationHandler);
        this.api.op(`${apiBase}/sequence/_kill/`, RunnerMessageCode.KILL, this.communicationHandler);
    }

    async hookupMonitorStream() {
        if (!this.monitorDownStream) {
            throw new Error("Monitor stream not initialized");
        }

        this.monitorDownStream.pipe(new StringStream())
            .JSONParse()
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .map(async ([code, data]: EncodedMonitoringMessage) => {
                switch (code) {
                case RunnerMessageCode.ACKNOWLEDGE:
                    break;
                case RunnerMessageCode.DESCRIBE_SEQUENCE:
                    break;
                case RunnerMessageCode.ALIVE:
                    break;
                case RunnerMessageCode.ERROR:
                    break;
                case RunnerMessageCode.MONITORING:
                    break;
                case RunnerMessageCode.EVENT:
                    break;
                case RunnerMessageCode.PING:
                    await this.handleHandshake();
                    break;
                case RunnerMessageCode.SNAPSHOT_RESPONSE:
                    break;
                default:
                    break;
                }
            })
            .run()
            .catch(async (error) => {
                console.error(this.errors.parsingError, error.stack);
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
            throw new HostError("UNINITIALIZED_STREAM", "control");
        }
    }

    controlStreamsCliHandler() {
        this.vorpal
            .command("alive", "Confirm that sequence is alive when it is not responding")
            .action(() => this.controlDataStream?.whenWrote([RunnerMessageCode.FORCE_CONFIRM_ALIVE, {}])); // ToDo: test fix

        this.vorpal
            .command("kill", "Kill forcefully sequence")
            .action(() => this.kill());

        this.vorpal
            .command("stop [TIMEOUT_NUMBER] [ALIVE_BOOLEAN]", "Stop gracefully sequence in provided timeout and prolong operations or not for task completion")
            .action((args: any) => {
                const timeout = parseInt(args.TIMEOUT_NUMBER, 10);
                const alive = args.ALIVE_BOOLEAN;
                const canCallKeepalive = alive === undefined ? alive : alive === "true";

                return isNaN(timeout)
                    ? this.vorpal.log(this.errors.noParams)
                    : this.stop(timeout, canCallKeepalive);
            });

        this.vorpal
            .command("event [EVENT_NAME] [ANY]", "Send event and any object, arry, function to the sequence")
            .action((args: any) => {
                const eventName = args.EVENT_NAME;
                const argAny = args.ANY;
                // TODO: eval needs removal... think about diff solution for all cases func, arr, string, num
                // eslint-disable-next-line no-eval
                const evalled = eval(argAny);
                const message = evalled === null || evalled === undefined ? argAny : evalled;

                return eventName === undefined && message === undefined
                    ? this.vorpal.log(this.errors.noParams)
                    : this.controlDataStream?.whenWrote([RunnerMessageCode.EVENT, { eventName, message }]);
            });

        this.vorpal
            .command("monitor [NUMBER]", "Change sequence monitoring rate")
            .alias("rate")
            .action((args: any) => {
                const monitoringRate = parseInt(args.NUMBER, 10);

                return isNaN(monitoringRate)
                    ? this.vorpal.log(this.errors.noParams)
                    : this.controlDataStream?.whenWrote([RunnerMessageCode.MONITORING_RATE, { monitoringRate }]);
            });

        this.vorpal
            .delimiter("sequence:")
            .show()
            .parse(process.argv);
    }

    async stop(timeout: number, canCallKeepalive: boolean) {
        await this.controlDataStream?.whenWrote([RunnerMessageCode.STOP, { timeout, canCallKeepalive }]);
    }

    async kill() {
        await this.controlDataStream?.whenWrote([RunnerMessageCode.KILL, {}]);
    }

    // For testing puspose only
    async vorpalExec(command: string) {
        await this.vorpal.execSync(command);
    }
}
