import { ReadableStream } from "./utils";

export type StreamsConfig = [
    stdin: ReadableStream<string>,
    stdout: ReadableStream<string>,
    stderr: ReadableStream<string>,
    // controllers (?)
];

export interface CSHConnector {
    /**
     * Cloud Server Host Client (CSHC) communicates with Cloud Server Host (CSH) and LifeCycle Controller (LCC).
     */

    /**
     * Create streams on LCC demand.
     * Temporary log streams to the console.
     * @param array of streams [stdin, stdout, stdr, controllers]
     * @returns array of streams
     */
    getClient(streamArray: StreamsConfig): ReadableStream<string>

    /**
     * Load file with sequence (for example zipped file) from ENV and return it as a stream.
     * Temporary the file is taken from declared path on local machine.
     * @param string with path form ENV
     * @returns stream with file sequence
     */
    getPackage(path: String): ReadableStream<string>
}
