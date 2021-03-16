/* eslint-disable dot-notation */
import { HandshakeAcknowledgeMessage, MessageUtilities } from "@scramjet/model";
import { RunnerMessageCode } from "@scramjet/model/src/runner-message";
import { CommunicationHandler } from "@scramjet/model/src/stream-handler";
import { CSHConnector } from "@scramjet/types/src/csh-client";
import { EncodedMessage, UpstreamStreamsConfig } from "@scramjet/types/src/message-streams";
import { createReadStream } from "fs";
import { DataStream } from "scramjet";
import { Readable, Writable } from "stream";

class CSHClient implements CSHConnector {
    PATH = process.env.SEQUENCE_PATH || "";
    errors = {
        params: "Wrong number of array params",
        emptyPath: "Path is empty"
    }
    private monitorStream: DataStream;
    private controlStream: DataStream;

    constructor() {
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

    hookCommunicationHandler(communicationHandler: CommunicationHandler) {
        communicationHandler.hookClientStreams(this.upstreamStreamsConfig());
        communicationHandler.addMonitoringHandler(RunnerMessageCode.PING,
            (message) => this.pingHandler(message));
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
            arguments: ["../../package/data.json", "out.txt"]//TODO think how to avoid passing relative path (from runner)
        };

        await this.controlStream.whenWrote(MessageUtilities.serializeMessage<RunnerMessageCode.PONG>(pongMsg));

        return message;
    }
}

export { CSHClient };
