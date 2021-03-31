import { ReadableStream, MaybePromise } from "./utils";
import { ICommunicationHandler } from "./communication-handler";

export interface CSHConnector {
    /**
     * CSHConnector is the interface used by the LifeCycle Controller (LCC)
     * to communicate with the Cloud Server Host (CSH).
     */

    /**
     * Initializes the client
     */
    init(): MaybePromise<void>;

    /**
     * Create array of streams on LCC demand than hook streams.
     * @param communicationHandler
     * Temporary log streams to the console.
     */
    hookCommunicationHandler(communicationHandler: ICommunicationHandler): MaybePromise<void>;

    /**
     * Load file with sequence (for example zipped file) from ENV and return it as a stream.
     * Temporary the file is taken from declared path on local machine.
     *
     * @returns stream with file sequence
     */
    getPackage(): ReadableStream<string>;

    /**
     * Disconnects from a host server.
     */
    disconnect(): void;

}
