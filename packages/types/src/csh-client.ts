import { ReadableStream } from "./utils";
import { UpstreamStreamsConfig } from "./message-streams";

export interface CSHConnector {
    /**
     * Cloud Server Host Client (CSHC) communicates with Cloud Server Host (CSH) and LifeCycle Controller (LCC).
     */
    PATH: string; // temporrary path to the sequence 

    /**
     * Create streams on LCC demand.
     * @returns array of streams
     */
    getClient(): UpstreamStreamsConfig;

    /**
     * Hook streams form LCC
     * @param array of streams
     * Temporary log streams to the console.
     */
    hookStreams(strem: UpstreamStreamsConfig): void;

    /**
     * Load file with sequence (for example zipped file) from ENV and return it as a stream.
     * Temporary the file is taken from declared path on local machine.
     * @param string with path form ENV
     * @returns stream with file sequence
     */
    getPackage(path: string): ReadableStream<string>;
}
