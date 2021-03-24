import { CommunicationHandler, HandshakeAcknowledgeMessage, MessageUtilities, RunnerMessageCode } from "@scramjet/model";
import { CSHConnector, EncodedMessage, UpstreamStreamsConfig } from "@scramjet/types";
import { createReadStream } from "fs";
import { DataStream } from "scramjet";
import { Readable, Writable } from "stream";
import * as vorpal from "vorpal";

class CSHClient implements CSHConnector {
    // TODO: get this from constructor invocation - move env to bin/
    PATH = process.env.SEQUENCE_PATH || "";
    // TODO: why is this public?
    errors = {
        notNumber: "Provide a number",
        emptyPath: "Path is empty"
    }
    private monitorStream: DataStream;
    private controlStream: DataStream;
    private vorpal: any;

    constructor(socketPath: string) {
        console.log(socketPath); // to be deleted
        this.controlStream = new DataStream();
        this.monitorStream = new DataStream();
        this.monitorStream
            .do((...arr: any[]) => console.log("[from monitoring]", ...arr))
            .run()
            .catch(e => console.error(e));
    }

    upstreamStreamsConfig() {
        return [
            process.stdin,
            process.stdout,
            process.stderr,
            this.controlStream as unknown as Readable,
            this.monitorStream as unknown as Writable
        ] as UpstreamStreamsConfig;
    }

    init() {
        this.vorpal = new vorpal();
    }

    controlStreamsHandler() {
        this.vorpal
            .command("alive", "Confirm that sequence is alive when it is not responding")
            .action(() => this.controlStream.whenWrote([RunnerMessageCode.ALIVE, {}]));

        this.vorpal
            .command("kill", "Kill forcefully sequence")
            .action(() => this.kill());

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
            .action(() => this.controlStream.whenWrote([RunnerMessageCode.STOP, {}]));

        this.vorpal
            .command("event [EVENT_NAME] [JSON | ARRAY | ... ]", "Send event to the sequence")
            .action((eventName: string, message: string) => {
                // TODO: needs removal... why not JSON.parse?
                let obj = eval(message); // temp eval

                return this.controlStream.whenWrote([RunnerMessageCode.EVENT, { eventName, obj }]);
            });

        this.vorpal
            .command("monitor [NUMBER]", "Change sequence monitoring rate")
            .alias("rate")
            .action((rate: string) => {
                let rateNum = parseInt(rate, 10);

                return isNaN(rateNum)
                    ? this.vorpal.log(this.errors.notNumber)
                    : this.controlStream.whenWrote([RunnerMessageCode.MONITORING_RATE, { rateNum }]);
            });

        this.vorpal
            .delimiter("sequence:")
            .show()
            .parse(process.argv);
    }

    hookCommunicationHandler(communicationHandler: CommunicationHandler) {
        communicationHandler.hookClientStreams(this.upstreamStreamsConfig());
        communicationHandler.addMonitoringHandler(RunnerMessageCode.PING,
            (message) => this.pingHandler(message));
        this.controlStreamsHandler();
    }

    getPackage(path = this.PATH): Readable {
        if (path === "") throw new Error(this.errors.emptyPath);

        return createReadStream(path);
    }

    async kill() {
        await this.controlStream.whenWrote([RunnerMessageCode.KILL, {}]);
    }

    async pingHandler(message: EncodedMessage<RunnerMessageCode.PING>) {
        const pongMsg: HandshakeAcknowledgeMessage = {
            msgCode: RunnerMessageCode.PONG,
            appConfig: { key: "app configuration value TODO" },
            arguments: ["../../package/data.json", "out.txt"] //TODO think how to avoid passing relative path (from runner)
        };

        await this.controlStream.whenWrote(MessageUtilities.serializeMessage<RunnerMessageCode.PONG>(pongMsg));

        return message;
    }
}

export { CSHClient };
