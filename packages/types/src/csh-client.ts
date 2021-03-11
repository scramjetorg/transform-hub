import { ReadableStream, MaybePromise } from "./utils";
import { CommunicationHandler } from "@scramjet/model/src/stream-handler";
import { EncodedMessage, UpstreamStreamsConfig } from "@scramjet/types/src/message-streams";
import { RunnerMessageCode } from "@scramjet/model/src/runner-message";

export interface CSHConnector {
    /**
     * Cloud Server Host Client (CSHC) communicates with Cloud Server Host (CSH) and LifeCycle Controller (LCC).
     */
    PATH: string; // temporrary path to the sequence

    /**
     * Helper method that creates an array with streams.
     * @returns array with stdio, stderr, control, and monitor streams
     */
    upstreamStreamsConfig(): UpstreamStreamsConfig;

    /**
     * Create array of streams on LCC demand than hook streams.
     * @param communicationHandler
     * Temporary log streams to the console.
     */
    hookCommunicationHandler(communicationHandler: CommunicationHandler): void;

    /**
     * Load file with sequence (for example zipped file) from ENV and return it as a stream.
     * Temporary the file is taken from declared path on local machine.
     * @param string with path form ENV
     * @returns stream with file sequence
     */
    getPackage(path: string): ReadableStream<string>;

    /**
     * Kill message type stream sent via control stream.
     * The message contains RunnerMessageCode.KILL and kill handler.
     */
    kill(): MaybePromise<void>;

    /**
     * Helper method with control message kill code and control message handler.
     * @returns array with RunnerMessageCode.KILL and empty object
     */
    killHandler(): EncodedMessage<RunnerMessageCode.KILL>;
}
