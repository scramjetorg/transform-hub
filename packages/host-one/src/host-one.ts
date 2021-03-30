import { HandshakeAcknowledgeMessage, MessageUtilities, RunnerMessageCode } from "@scramjet/model";
import { AppConfig, EncodedMonitoringMessage, DownstreamStreamsConfig } from "@scramjet/types";
import { ReadStream, unlink } from "fs";
import { Server as HttpServer } from "http";
import * as os from "os";
import * as path from "path";
import { DataStream, StringStream } from "scramjet";
import { PassThrough } from "stream";
import * as vorpal from "vorpal";
import { SocketServer } from "./lib/server";
import { startSupervisor } from "./lib/start-supervisor";

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
    private packageStream?: ReadStream;
    // @ts-ignore
    private streams: DownstreamStreamsConfig;

    // @ts-ignore
    private controlDataStream: DataStream;
    // @ts-ignore
    private configPath: string;
    // @ts-ignore
    private vorpal: any;

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
        //await this.createApiServer();
    }

    async init(packageStream: ReadStream, appConfig: AppConfig, sequenceArgs?: any[]) {
        this.packageStream = packageStream;
        this.appConfig = appConfig;
        this.sequenceArgs = sequenceArgs;

        this.controlStream = new PassThrough();
        this.controlDataStream = new DataStream();

        this.controlDataStream.JSONStringify()
            .pipe(this.controlStream);

        this.monitorStream = new PassThrough();

        this.streams = [
            process.stdin,
            process.stdout,
            process.stderr,
            this.controlStream,
            this.monitorStream,
            this.packageStream,
            new PassThrough(),
            new PassThrough()
        ];

        this.vorpal = new vorpal();
    }

    getAppConfig(configPath: string): AppConfig {
        return require(configPath);
    }

    async createNetServer(): Promise<void> {
        this.netServer = new SocketServer(this.socketName);

        this.netServer.attachStreams(this.streams);
        this.netServer.start();

        process.on("beforeExit", () => {
            // TODO: check if this works for process.on("SIGINT"
            unlink(this.socketName, (err) => {
                if (err) {
                    throw new Error("Can't remove socket file");
                }
            });
        });

        return Promise.resolve();
    }

    async createApiServer(): Promise<void> {
        throw new Error(this.errors.noImplement);
    }

    async hookupMonitorStream() {
        StringStream.from(this.monitorStream)
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
            .action(() => this.controlDataStream.whenWrote([RunnerMessageCode.ALIVE, {}]));

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
                let eventName = args.EVENT_NAME;
                let argAny = args.ANY;
                // TODO: eval needs removal... think about diff solution for all cases func, arr, string, num
                let message = eval(argAny) === null || eval(argAny) === undefined ? argAny : eval(argAny);

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

    async stop(timeout: number, canCallKeepalive: boolean) {
        await this.controlDataStream.whenWrote([RunnerMessageCode.STOP, { timeout, canCallKeepalive }]);
    }

    async kill() {
        await this.controlDataStream.whenWrote([RunnerMessageCode.KILL, {}]);
    }

    // For testing puspose only
    async vorpalExec(command: string) {
        await this.vorpal.execSync(command);
    }
}
