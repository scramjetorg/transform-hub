import { ReadableStream, MaybePromise } from "./utils";
import { CommunicationHandler } from "@scramjet/model/src/stream-handler";

export interface CSHConnector {
    /**
     * Cloud Server Host Client (CSHC) communicates with Cloud Server Host (CSH) and LifeCycle Controller (LCC).
     */
    PATH: string; // temporrary path to the sequence

    /**
     * Create array of streams on LCC demand than hook streams
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
     * kontrolnym strumieniem przesyłamy wiadomość typu kill w formacie wew. code, ...
     */
    kill(): MaybePromise<void>;
}
