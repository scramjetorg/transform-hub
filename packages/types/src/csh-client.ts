import { ReadableStream } from "./utils";
import { UpstreamStreamsConfig } from "./message-streams";

export interface CSHConnector {
    /**
     * Cloud Server Host Client (CSHC) communicates with Cloud Server Host (CSH) and LifeCycle Controller (LCC).
     */

    /**
     * Create streams on LCC demand.
     * Temporary log streams to the console.
     * @param array of streams [stdin, stdout, stdr, monitor, controll]
     * @returns array of streams
     */
    getClient(streamArray: UpstreamStreamsConfig): UpstreamStreamsConfig

    /**
     * Load file with sequence (for example zipped file) from ENV and return it as a stream.
     * Temporary the file is taken from declared path on local machine.
     * @param string with path form ENV
     * @returns stream with file sequence
     */
    getPackage(path: String): ReadableStream<string>
}
