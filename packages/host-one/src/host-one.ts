import { HandshakeAcknowledgeMessage, MessageUtilities, RunnerMessageCode } from "@scramjet/model";
import { AppConfig, DownstreamStreamsConfig, EncodedMonitoringMessage } from "@scramjet/types";
import { exec } from "child_process";
import { ReadStream } from "fs";
import { Server as HttpServer } from "http";
import { DataStream, StringStream } from "scramjet";
import { PassThrough } from "stream";
import * as vorpal from "vorpal";
import { SocketServer } from "./lib/server";

export class HostOne {
    // @ts-ignore
    private socketName: string = "/tmp/test-server-sock";//TODO should be unique
    private netServer?: SocketServer;
    // @ts-ignore
    private httpApiServer: HttpServer;
    // @ts-ignore
    private monitorStream: ReadableStream<string>;
    // @ts-ignore
    private controlStream: PassThrough;

    // @ts-ignore
    private controlStreamD: DataStream;
    // @ts-ignore
    private configPath: string;
    // @ts-ignore
    private vorpal: any;
    // @ts-ignore
    private packageStream?: ReadStream;

    errors = {
        noParams: "No params provided. Type help to know more.",
        parsingError: "An error occurred during parsing monitoring message.",
        noImplement: "Method not implemented."
    }

    private appConfig: AppConfig = {};
    private sequenceArgs?: string[];

    async main(): Promise<void> {
        await this.hookupMonitorStream();
        await this.createNetServer();
        await this.startSupervisor();
        await this.createApiServer();
    }

    async init(packageStream: ReadStream, appConfig: AppConfig, sequenceArgs?: any[]) {
        this.packageStream = packageStream;
        this.appConfig = appConfig;
        this.sequenceArgs = sequenceArgs;

        this.controlStream = new PassThrough();

        this.controlStreamD = new DataStream();


        this.controlStreamD.JSONStringify()
            .pipe(this.controlStream);

        this.monitorStream = new PassThrough();
        this.vorpal = new vorpal();
    }

    getAppConfig(configPath: string): AppConfig {
        return require(configPath);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async createNetServer(): Promise<void> {
        this.netServer = new SocketServer(this.socketName);

        const streams: DownstreamStreamsConfig = [
            process.stdin,
            process.stdout,
            process.stderr,
            this.controlStream,
            this.monitorStream,
            new PassThrough(),
            this.packageStream
        ];

        this.netServer.attachStreams(streams);
        this.netServer.start();

        return Promise.resolve();
    }


    async createApiServer(): Promise<void> {
        //throw new Error(this.errors.noImplement);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async startSupervisor(): Promise<void> {
        //throw new Error("Method not implemented.");

        console.log("[H1] Starting supervisor");
        let cp =
        exec("ts-node ../../../supervisor/src/bin/supervisor " + this.socketName, (err) => {
            if (err) console.error(err);
        });

        cp.stdout?.pipe(process.stdout);
        cp.stderr?.pipe(process.stdout);
    }

    async hookupMonitorStream() {
        //TODO monitorStream has to be demuxed before?
        StringStream.from(this.monitorStream)
            //.stringify()
            .do(d => { console.log("hookupMonitorStream", d); })
            .JSONParse()
            .map(async ([code, data]: EncodedMonitoringMessage) => {
                console.log(code, data);//TODO delete
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
        console.log("handle handshake");
        const pongMsg: HandshakeAcknowledgeMessage = {
            msgCode: RunnerMessageCode.PONG,
            appConfig: this.appConfig,
            arguments: this.sequenceArgs
        };

        console.log("write handshake");
        await this.controlStreamD.whenWrote(MessageUtilities.serializeMessage<RunnerMessageCode.PONG>(pongMsg));
        console.log("after write handshake");
    }

    controlStreamsCliHandler() {
        this.vorpal
            .command("alive", "Confirm that sequence is alive when it is not responding")
            .action(() => this.controlStreamD.whenWrote([RunnerMessageCode.ALIVE, {}]));

        this.vorpal
            .command("kill", "Kill forcefully sequence")
            .action(() => this.controlStreamD.whenWrote([RunnerMessageCode.KILL, {}]));

        this.vorpal
            .command("stop", "Stop gracefully sequence")
            /*
            * @feature/analysis-stop-kill-invocation
            * Stop message must include two properties:
            * timeout: number - the Sequence will be stopped after the provided timeout (miliseconds)
            * canCallKeepalive: boolean - indicates whether Sequence can prolong operation to complete the task
            * required for AppContext's:
            * stopHandler?: (timeout: number, canCallKeepalive: boolean) => MaybePromise<void>;
            * once the promise is resolved the Runner assumes it is safe to stop the Sequence
            */
            .action(() => this.controlStreamD.whenWrote([RunnerMessageCode.STOP, {}]));

        this.vorpal
            .command("event [EVENT_NAME] [ANY]", "Send event and any object, arry, function to the sequence")
            .action((args: any) => {
                let eventName = args.EVENT_NAME;
                let argAny = args.ANY;
                // TODO: eval needs removal... think about diff solution for all cases func, arr, string, num
                let message = eval(argAny) === null || eval(argAny) === undefined ? argAny : eval(argAny);

                return eventName === undefined && message === undefined
                    ? this.vorpal.log(this.errors.noParams)
                    : this.controlStreamD.whenWrote([RunnerMessageCode.EVENT, { eventName, message }]);
            });

        this.vorpal
            .command("monitor [NUMBER]", "Change sequence monitoring rate")
            .alias("rate")
            .action((args: any) => {
                let monitoringRate = parseInt(args.NUMBER, 10);

                return isNaN(monitoringRate)
                    ? this.vorpal.log(this.errors.noParams)
                    : this.controlStreamD.whenWrote([RunnerMessageCode.MONITORING_RATE, { monitoringRate }]);
            });

        this.vorpal
            .delimiter("sequence:")
            .show()
            .parse(process.argv);
    }

    // For testing puspose only
    async vorpalExec(command: string) {
        await this.vorpal.execSync(command);
    }
}
