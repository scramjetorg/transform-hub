import { CeroError, createServer } from "@scramjet/api-server";
import { CommunicationHandler, HostError, MessageUtilities } from "@scramjet/model";
import { APIExpose, AppConfig, DownstreamStreamsConfig, EncodedMonitoringMessage, HandshakeAcknowledgeMessage, UpstreamStreamsConfig, ICommunicationHandler, IComponent, Logger } from "@scramjet/types";
import { CommunicationChannel, RunnerMessageCode } from "@scramjet/symbols";

import { getLogger } from "@scramjet/logger";
import { ReadStream } from "fs";
import * as os from "os";
import * as path from "path";
import { DataStream, StringStream } from "scramjet";
import { PassThrough, Readable, Writable } from "stream";
import { SocketServer } from "./lib/server";
import { startSupervisor } from "./lib/start-supervisor";

//import * as vorpal from "vorpal";

export class HostOne implements IComponent {
    /**
     * SocketServer instance.
     */
    private socketServer?: SocketServer;

    /**
     * SocketServer path (address).
     * Supervisor connects to this path.
     */
    private socketServerPath: string;

    /**
     * Control stream.
     * Stream to send commands down via SocketServer.
     */
    private controlDownstream: PassThrough;

    /**
     * Streams connected do API.
     */
    private upStreams?: UpstreamStreamsConfig;

    /**
     * Streams connected do SocketServer.
     */
    private downStreams?: DownstreamStreamsConfig;

    private controlDataStream: DataStream;

    private vorpal?: any;

    /**
     * Stream with package containing sequence.
     */
    private packageDownStream?: ReadStream;

    /**
     * API server.
     */
    private api?: APIExpose;

    /**
     * CommunicationHelper instance.
     * Used to pipe upstreams with downstreams.
     */
    private communicationHandler: ICommunicationHandler = new CommunicationHandler();

    /**
     * StringStream from log stream.
     */
    private logHistory?: StringStream;

    /**
     * Logger.
     */
    logger: Logger;

    errors = {
        noParams: "No params provided. Type help to know more.",
        parsingError: "An error occurred during parsing monitoring message.",
        noImplement: "Method not implemented."
    }

    /**
     * Sequence configuration passed via run parameters.
     */
    private appConfig: AppConfig = {};

    /**
     * Sequence arguments passed via script parameters.
     */
    private sequenceArgs?: string[];

    /**
     * Sequence input stream.
     */
    private readonly input = new PassThrough();

    /**
     * Sequence output stream.
     */
    private readonly output = new PassThrough();

    constructor() {
        this.logger = getLogger(this);
        this.socketServerPath = path.join(os.tmpdir(), process.pid.toString());
        this.controlDownstream = new PassThrough();
        this.controlDataStream = new DataStream();
    }

    /**
     * Starts all submodules.
     */
    async main(): Promise<void> {
        this.logger.info("Main");

        await this.createNetServer();
        this.logger.info("Created Net Server");

        await startSupervisor(this.logger, this.socketServerPath, this.onSupervisorExit.bind(this));
        this.logger.info("Started supervisor");

        await this.awaitConnection();
        this.logger.info("Got connection");

        this.hookupStreams();
        this.logger.info("Downstream hooked.");

        this.hookupMonitorStream();
        this.logger.info("Monitor stream hooked.");

        await this.createApiServer();
        this.logger.info("Api server up");

        StringStream.from(this.output)
            .lines()
            .do((m) => this.logger.log("Received data on OUTPUT stream:", m));

        //this.vorpal = new vorpal();
        //this.controlStreamsCliHandler();
    }

    /**
     * Initializes HostOne.
     *
     * @param { ReadStream } packageStream - sequence stream
     * @param { object } appConfig - config file
     * @param { Array<any> } sequenceArgs - other optional arguments
     */
    init(packageStream: ReadStream, appConfig: AppConfig, sequenceArgs?: any[]) {
        this.packageDownStream = packageStream;
        this.appConfig = appConfig;
        this.sequenceArgs = sequenceArgs;

        // TODO: multihost would send stdio only to API
        // TODO: log stream should not pass the sequence logs to stderr here, but only to API
        //       however the rest should go there.
        // TODO: Assigning streams in this way requires proper order. Any order change here breaks everything.
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

        this.controlDataStream
            .JSONStringify()
            .pipe(this.controlDownstream);

        this.communicationHandler.hookUpstreamStreams(this.upStreams);
        this.logger.log("Streams initialized.");
    }

    /**
     * Creates StringStream from log stream.
     */
    hookLogStream() {
        if (this.upStreams && this.upStreams[CommunicationChannel.LOG]) {
            this.logHistory = StringStream
                .from(this.upStreams[CommunicationChannel.LOG] as unknown as Readable)
                .lines()
                .keep(1000); // TODO: config

            // TODO: Remove, its used to show logs on output (for development purposes only).
            this.upStreams[CommunicationChannel.LOG].pipe(process.stdout);
            this.upStreams[CommunicationChannel.OUT].pipe(process.stdout);
        } else {
            this.logger.error("Uninitialized LOG stream.");
            throw new HostError("UNINITIALIZED_STREAM", "log");
        }
    }

    /**
     * Starts socket server.
     */
    async createNetServer(): Promise<void> {
        this.socketServer = new SocketServer(this.socketServerPath);

        await this.socketServer.start();
    }

    /**
     * Creates API Server and defines it's endpoints.
     */
    async createApiServer(): Promise<void> {
        const conf = {};
        const apiBase = "/api/v1";
        const {
            stdin,
            stderr,
            stdout
        } = this.communicationHandler.getStdio();

        this.api = createServer(conf);
        this.api.server.listen(8000); // add .unref() or server will keep process up
        process.on("beforeExit", () => {
            console.log("YYYYYYYYYYYYYYYY beforeExit TODELETE");
            this.api?.server?.close();
        });
        // stdio
        this.api.upstream(`${apiBase}/stream/stdout`, stdout);
        this.api.upstream(`${apiBase}/stream/stderr`, stderr);
        this.api.downstream(`${apiBase}/stream/stdin`, stdin);

        // log stream
        this.api.upstream(`${apiBase}/stream/log`, () => {
            if (this.logHistory) {
                return this.logHistory; //.rewind();
            }

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
        this.api.op(`${apiBase}/sequence/_monitoring_rate/`, "post", RunnerMessageCode.MONITORING_RATE, this.communicationHandler);
        this.api.op(`${apiBase}/sequence/_event/`, "post", RunnerMessageCode.EVENT, this.communicationHandler);
        this.api.op(`${apiBase}/sequence/_stop/`, "post", RunnerMessageCode.STOP, this.communicationHandler);
        this.api.op(`${apiBase}/sequence/_kill/`, "post", RunnerMessageCode.KILL, this.communicationHandler);

        await new Promise(res => {
            this.api?.server.once("listening", res);
        });
    }

    // TODO: refactor - rename or split, it is more than waiting for connection.
    async awaitConnection() {
        // TODO: We should wait some time, but when runner doesn't connect we need to alert
        this.downStreams = await new Promise((res) => {
            if (!this.socketServer) {
                throw new Error("Server not initialized");
            }

            this.socketServer.once("connect", res);
        });
    }

    /**
     * Connects upstreams with downstreams.
     */
    hookupStreams() {
        if (!this.downStreams) {
            throw new HostError("UNINITIALIZED_STREAM", "downStreams");
        }

        this.communicationHandler.hookDownstreamStreams(this.downStreams);
        this.communicationHandler.pipeStdio();
        this.communicationHandler.pipeMessageStreams();
        this.communicationHandler.pipeDataStreams();

        this.hookLogStream();
    }

    /**
     * Adds handshake listener to monitor stream.
     */
    hookupMonitorStream() {
        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.PING, async () => {
            await this.handleHandshake();

            return null;
        });

        // TODO: To remove. It is used to log monitoring stream.
        this.communicationHandler.getMonitorStream().stringify(([code, message]: EncodedMonitoringMessage) => {
            this.logger.info(`Received on monitorStream: ${code}, ${JSON.stringify(message)}`);

            return `[monitor: ${code}]: ${JSON.stringify(message)}`;
        });
    }

    /**
     * Sends handshake response via control stream.
     * Response contains sequence configuration and arguments.
     */
    async handleHandshake() {
        if (this.controlDataStream) {
            const pongMsg: HandshakeAcknowledgeMessage = {
                msgCode: RunnerMessageCode.PONG,
                appConfig: this.appConfig,
                args: this.sequenceArgs
            };

            await this.controlDataStream.whenWrote(MessageUtilities.serializeMessage<RunnerMessageCode.PONG>(pongMsg));
        } else {
            throw new HostError("UNINITIALIZED_STREAM", "control");
        }
    }

    /**
     * Sends stop command via control stream.
     *
     * @param timeout The time the sequence has to respond.
     * @param canCallKeepalive When true, sequence can ask to be allowed to run for additional period of time.
     */
    async stop(timeout: number, canCallKeepalive: boolean) {
        await this.controlDataStream.whenWrote([RunnerMessageCode.STOP, { timeout, canCallKeepalive }]);
    }

    /**
     * Sends kill command via control stream.
     */
    async kill() {
        await this.controlDataStream.whenWrote([RunnerMessageCode.KILL, {}]);
    }

    // TODO: move this to tests or however we see it...
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
                const timeout = parseInt(args.TIMEOUT_NUMBER, 10);

                return isNaN(timeout)
                    ? this.vorpal.log(this.errors.noParams)
                    : this.stop(timeout, args.ALIVE_BOOLEAN === "true");
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
                const monitoringRate = parseInt(args.NUMBER, 10);

                return isNaN(monitoringRate)
                    ? this.vorpal.log(this.errors.noParams)
                    : this.controlDataStream.whenWrote([RunnerMessageCode.MONITORING_RATE, { monitoringRate }]);
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

    cleanup() {
        return new Promise(resolve => {
            if (this.upStreams) {
                // eslint-disable-next-line no-extra-parens
                (this.upStreams[6] as Writable).end();
                // eslint-disable-next-line no-extra-parens
                (this.upStreams[7] as Writable).end();
            }

            this.api?.server.close(resolve);
        });
    }

    async onSupervisorExit(code: any, signal: any) {
        this.logger.log("Supervisor process exited with code: " + code + ", signal: " + signal);

        await this.cleanup();

        this.logger.log("Exiting...");

        setTimeout(() => {
            process.exit(code);
        }, 10);
    }
}
