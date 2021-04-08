import { CommunicationHandler, HandshakeAcknowledgeMessage, MessageUtilities, RunnerMessageCode } from "@scramjet/model";
import { APIExpose, AppConfig, ReadableStream, DownstreamStreamsConfig, EncodedMonitoringMessage, UpstreamStreamsConfig, WritableStream, EncodedControlMessage } from "@scramjet/types";
import { ReadStream } from "fs";
import { Server as HttpServer } from "http";
import * as os from "os";
import * as path from "path";
import { DataStream, StringStream } from "scramjet";
import { PassThrough } from "stream";
//import * as vorpal from "vorpal";
import { SocketServer } from "./lib/server";
import { startSupervisor } from "./lib/start-supervisor";
import { createServer } from "@scramjet/api-server";

export class HostOne {
    private socketName: string;
    private netServer?: SocketServer;
    // @ts-ignore
    private httpApiServer: HttpServer;
    // @ts-ignore
    private monitorStream: ReadableStream<string>;
    // @ts-ignore
    private controlStream: PassThrough;
    // @ts-ignore
    private downStreams: DownstreamStreamsConfig;
    // @ts-ignore
    private upStreams: UpstreamStreamsConfig;
    // @ts-ignore
    private controlDataStream: DataStream;
    // @ts-ignore
    private configPath: string;
    // @ts-ignore
    private vorpal: any;
    // @ts-ignore
    private packageStream?: ReadStream;
    // @ts-ignore
    private stdin: Stream;
    // @ts-ignore
    private stdout: Stream;
    // @ts-ignore
    private api: APIExpose;
    // @ts-ignore
    private communicationHandler: ICommunicationHandler = new CommunicationHandler();
    private keepAliveRequested?: boolean;

    errors = {
        noParams: "No params provided. Type help to know more.",
        parsingError: "An error occurred during parsing monitoring message.",
        noImplement: "Method not implemented."
    }

    private appConfig: AppConfig = {};
    private sequenceArgs?: string[];

    constructor() {
        this.socketName = path.join(os.tmpdir(), process.pid.toString());
    }

    async main(): Promise<void> {
        await this.hookupMonitorStream();
        await this.createNetServer();
        await startSupervisor(this.socketName);
        await this.createApiServer();

        //this.vorpal = new vorpal();
        //this.controlStreamsCliHandler();
    }

    async init(packageStream: ReadStream, appConfig: AppConfig, sequenceArgs?: any[]) {
        this.packageStream = packageStream;
        this.appConfig = appConfig;
        this.sequenceArgs = sequenceArgs;
        this.communicationHandler = new CommunicationHandler();
        this.controlStream = new PassThrough();
        this.controlDataStream = new DataStream();

        this.monitorStream = new PassThrough();
        this.stdin = new PassThrough();
        this.stdout = new PassThrough();

        this.downStreams = [
            this.stdin,
            this.stdout,
            new PassThrough(),
            this.controlStream,
            this.monitorStream,
            this.packageStream,
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
            new PassThrough()
        ];

        this.controlDataStream.JSONStringify()
            .pipe(this.upStreams[3] as unknown as WritableStream<EncodedControlMessage>);

        this.communicationHandler.hookUpstreamStreams(this.upStreams);
        this.communicationHandler.hookDownstreamStreams(this.downStreams);
        this.communicationHandler.pipeStdio();
        this.communicationHandler.pipeMessageStreams();

        this.upStreams[1]?.pipe(process.stdout);

        //this.vorpal = new vorpal();
        //this.controlStreamsCliHandler();
    }

    getAppConfig(configPath: string): AppConfig {
        return require(configPath);
    }

    async createNetServer(): Promise<void> {
        this.netServer = new SocketServer(this.socketName);

        this.netServer.attachStreams(this.downStreams);
        this.netServer.start();

        process.on("beforeExit", () => {
            console.warn("beforeExit");


        });

        return Promise.resolve();
    }

    async createApiServer(): Promise<void> {
        const conf = {};
        const apiBase = "/api/v1";

        this.api = createServer(conf);
        this.api.server.listen(8000).unref(); // add .unref() or server will keep process up

        /**
         * ToDo: GET
         * * /api/v1/stream/stdout/
         * * /api/v1/stream/stderr/
         */
        // this.api.upstream(`${apiBase}/stream/stdout`, {stream}, {commHandler})

        /**
         * ToDo: GET
         * * /api/v1/bash/log/
         */

        /**
         * ToDo: POST
         * * /api/v1/stream/stdin/
         */
        // this.api.downstream(`${apiBase}/stream/stdin`, {stream}, {commHandler})

        this.api.get(`${apiBase}/sequence/health`, RunnerMessageCode.DESCRIBE_SEQUENCE, this.communicationHandler);
        this.api.get(`${apiBase}/sequence/status`, RunnerMessageCode.STATUS, this.communicationHandler);
        this.api.op(`${apiBase}/sequence/_monitoring_rate/`, RunnerMessageCode.MONITORING_RATE, this.communicationHandler);
        this.api.op(`${apiBase}/sequence/_stop/`, RunnerMessageCode.STOP, this.communicationHandler);
        this.api.op(`${apiBase}/sequence/_kill/`, RunnerMessageCode.KILL, this.communicationHandler);
    }

    async hookupMonitorStream() {
        this.monitorStream.pipe(new StringStream())
            .JSONParse()
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .map(async ([code, data]: EncodedMonitoringMessage) => {
                switch (code) {
                case RunnerMessageCode.ACKNOWLEDGE:
                    break;
                case RunnerMessageCode.DESCRIBE_SEQUENCE:
                    break;
                case RunnerMessageCode.ALIVE:
                    this.keepAliveRequested = true;
                    break;
                case RunnerMessageCode.ERROR:
                    break;
                case RunnerMessageCode.MONITORING:
                    break;
                case RunnerMessageCode.EVENT:
                    break;
                case RunnerMessageCode.PING:
                    this.handleHandshake();
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
        const pongMsg: HandshakeAcknowledgeMessage = {
            msgCode: RunnerMessageCode.PONG,
            appConfig: this.appConfig,
            arguments: this.sequenceArgs
        };

        await this.controlDataStream.whenWrote(MessageUtilities.serializeMessage<RunnerMessageCode.PONG>(pongMsg));
    }

    controlStreamsCliHandler() {
        this.vorpal
            .command("alive", "Confirm that sequence is alive when it is not responding")
            .action(() => this.controlDataStream.whenWrote([RunnerMessageCode.FORCE_CONFIRM_ALIVE, {}])); // ToDo: test fix

        this.vorpal
            .command("kill", "Kill forcefully sequence")
            .action(() => this.kill());

        this.vorpal
            .command("stop [TIMEOUT_NUMBER] [ALIVE_BOOLEAN]", "Stop gracefully sequence in provided timeout and prolong operations or not for task completion")
            .action((args: any) => {
                let timeout = parseInt(args.TIMEOUT_NUMBER, 10);
                let alive = args.ALIVE_BOOLEAN;
                let canCallKeepalive = alive === undefined ? alive : alive === "true";

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
                    : this.controlDataStream.whenWrote([RunnerMessageCode.EVENT, { eventName, message }]);
            });

        this.vorpal
            .command("monitor [NUMBER]", "Change sequence monitoring rate")
            .alias("rate")
            .action((args: any) => {
                let monitoringRate = parseInt(args.NUMBER, 10);

                return isNaN(monitoringRate)
                    ? this.vorpal.log(this.errors.noParams)
                    : this.controlDataStream.whenWrote([RunnerMessageCode.MONITORING_RATE, { monitoringRate }]);
            });

        this.vorpal
            .delimiter("sequence:")
            .show()
            .parse(process.argv);
    }

    //TODELETE?
    async stop(timeout: number, canCallKeepalive: boolean) {
        await this.controlDataStream.whenWrote([RunnerMessageCode.STOP, { timeout, canCallKeepalive }]);
        //if keep alive then postpone stopping/killing
        await new Promise(async (resolve) => {
            setTimeout(async () => {
                if (this.keepAliveRequested)
                    await this.stop(timeout, canCallKeepalive);
                else
                    this.kill();
                resolve(0);
            }, timeout);
        });
    }

    async kill() {
        await this.controlDataStream.whenWrote([RunnerMessageCode.KILL, {}]);
    }

    // For testing puspose only
    async vorpalExec(command: string) {
        await this.vorpal.execSync(command);
    }
}
