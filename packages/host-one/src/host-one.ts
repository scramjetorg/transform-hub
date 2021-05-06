import { CeroError, createServer } from "@scramjet/api-server";
import { CommunicationChannel, CommunicationHandler, HandshakeAcknowledgeMessage, HostError, MessageUtilities } from "@scramjet/model";
import { APIExpose, AppConfig, DownstreamStreamsConfig, EncodedMonitoringMessage, UpstreamStreamsConfig, ICommunicationHandler, IComponent, Logger } from "@scramjet/types";
import { RunnerMessageCode } from "@scramjet/symbols";

import { getLogger } from "@scramjet/logger";
import { ReadStream } from "fs";
import * as os from "os";
import * as path from "path";
import { DataStream, StringStream } from "scramjet";
import { PassThrough, Readable } from "stream";
import { SocketServer } from "./lib/server";
import { startSupervisor } from "./lib/start-supervisor";

//import * as vorpal from "vorpal";

export class HostOne implements IComponent {
    private socketName: string;

    private netServer?: SocketServer;

    private controlDownstream?: PassThrough;

    private upStreams?: UpstreamStreamsConfig;

    private controlDataStream?: DataStream;

    private vorpal?: any;

    private packageDownStream?: ReadStream;

    private api?: APIExpose;

    private communicationHandler: ICommunicationHandler = new CommunicationHandler();

    private logHistory?: StringStream;

    logger: Logger;

    errors = {
        noParams: "No params provided. Type help to know more.",
        parsingError: "An error occurred during parsing monitoring message.",
        noImplement: "Method not implemented."
    }

    private appConfig: AppConfig = {};
    private sequenceArgs?: string[];

    private readonly input = new PassThrough();
    private readonly output = new PassThrough();

    constructor() {
        this.logger = getLogger(this);
        this.socketName = path.join(os.tmpdir(), process.pid.toString());
    }

    async main(): Promise<void> {
        this.logger.info("Main");

        await this.createNetServer();
        this.logger.info("Created Net Server");

        await startSupervisor(this.logger, this.socketName);
        this.logger.info("Started supervisor");

        await this.awaitConnection();
        this.logger.info("Got connection");

        await this.hookupMonitorStream();
        this.logger.info("Hooked monitor stream");

        await this.createApiServer();
        this.logger.info("Api server up");

        StringStream.from(this.output)
            .lines()
            .do((m) => this.logger.log("Received data on OUTPUT stream:", m));

        //this.logger.log("Sending test data on input stream...");
        //this.input.write("------------- TEST INPUT DATA");

        //this.vorpal = new vorpal();
        //this.controlStreamsCliHandler();
    }

    async init(packageStream: ReadStream, appConfig: AppConfig, sequenceArgs?: any[]) {
        this.packageDownStream = packageStream;
        this.appConfig = appConfig;
        this.sequenceArgs = sequenceArgs;

        this.controlDownstream = new PassThrough();
        this.controlDataStream = new DataStream();

        // TODO: multihost would send stdio only to API
        // TODO: log stream should not pass the sequence logs to stderr here, but only to API
        //       however the rest should go there.
        this.upStreams = [
            process.stdin, // this should be e2e encrypted
            process.stdout, // this should be e2e encrypted
            process.stderr, // this should be e2e encrypted
            this.controlDownstream, // control
            process.stdout, // monitor
            this.input, // this should be e2e encrypted
            this.output, // this should be e2e encrypted
            new PassThrough(), // this should be e2e encrypted (LOG FILE)
            this.packageDownStream
        ];

        this.logger.log("Streams initialized.");

        this.controlDataStream
            .JSONStringify()
            .pipe(this.controlDownstream);

        this.communicationHandler.hookUpstreamStreams(this.upStreams);
    }

    hookLogStream() {
        if (this.upStreams && this.upStreams[CommunicationChannel.LOG]) {
            this.logHistory = StringStream
                .from(this.upStreams[CommunicationChannel.LOG] as unknown as Readable)
                .lines()
                .keep(1000); // TODO: config

            this.upStreams[CommunicationChannel.LOG].pipe(process.stdout);
            this.upStreams[CommunicationChannel.OUT].pipe(process.stdout);
        } else {
            this.logger.error("Uninitialized LOG stream.");
            throw new HostError("UNINITIALIZED_STREAM", "log");
        }
    }

    getAppConfig(configPath: string): AppConfig {
        return require(configPath);
    }

    async createNetServer(): Promise<void> {
        this.netServer = new SocketServer(this.socketName);

        await this.netServer.start();

        process.on("beforeExit", () => {
            console.warn("beforeExit");
        });
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

        // stdio
        this.api.upstream(`${apiBase}/stream/stdout`, stdout);
        this.api.upstream(`${apiBase}/stream/stderr`, stderr);
        this.api.downstream(`${apiBase}/stream/stdin`, stdin);

        // log stream
        this.api.upstream(`${apiBase}/stream/log`, () => {
            if (this.logHistory) return this.logHistory;
            // if (this.logHistory) return this.logHistory.rewind();

            throw new CeroError("ERR_NOT_CURRENTLY_AVAILABLE");
        });

        // TODO: these streams should be accessible as merged (${apibase}/stream/input+output)
        // input and output
        this.api.upstream(`${apiBase}/stream/output`, this.output); // TODO: Config
        this.api.downstream(`${apiBase}/stream/input`, this.input); // TODO: Config

        // monitoring data
        this.api.get(`${apiBase}/sequence/health`, RunnerMessageCode.MONITORING, this.communicationHandler);
        this.api.get(`${apiBase}/sequence/status`, RunnerMessageCode.STATUS, this.communicationHandler);
        this.api.get(`${apiBase}/sequence/event`, RunnerMessageCode.EVENT, this.communicationHandler);

        // operations
        this.api.op(`${apiBase}/sequence/_monitoring_rate/`, RunnerMessageCode.MONITORING_RATE, this.communicationHandler);
        this.api.op(`${apiBase}/sequence/_event/`, RunnerMessageCode.EVENT, this.communicationHandler);
        this.api.op(`${apiBase}/sequence/_stop/`, RunnerMessageCode.STOP, this.communicationHandler);
        this.api.op(`${apiBase}/sequence/_kill/`, RunnerMessageCode.KILL, this.communicationHandler);

        await new Promise(res => {
            this.api?.server.once("listening", res);
        });
    }

    async awaitConnection() {
        // TODO: We should wait some time, but when runner doesn't connect we need to alert
        const streams: DownstreamStreamsConfig = await new Promise((res) => {
            if (!this.netServer) throw new Error("Server not initialized");
            this.netServer.once("connect", res);
        });

        this.logger.info("Piping streams...");
        this.communicationHandler.hookDownstreamStreams(streams);
        this.communicationHandler.pipeStdio();
        this.communicationHandler.pipeMessageStreams();
        this.communicationHandler.pipeDataStreams();
        this.hookLogStream();
    }

    hookupMonitorStream() {
        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.PING, async () => {
            await this.handleHandshake();
            return null;
        });

        this.communicationHandler.getMonitorStream().stringify(([code, message]: EncodedMonitoringMessage) => {
            this.logger.info(`Received on monitorStream: ${code}, ${JSON.stringify(message)}`);
            return `[monitor: ${code}]: ${JSON.stringify(message)}`;
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

    async stop(timeout: number, canCallKeepalive: boolean) {
        // TODO: we need to get rid of those question marks
        await this.controlDataStream?.whenWrote([RunnerMessageCode.STOP, { timeout, canCallKeepalive }]);
    }

    async kill() {
        await this.controlDataStream?.whenWrote([RunnerMessageCode.KILL, {}]);
    }

    // TODO: move this to tests or however we see it...
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

    // For testing puspose only
    async vorpalExec(command: string) {
        await this.vorpal?.execSync(command);
    }
}
