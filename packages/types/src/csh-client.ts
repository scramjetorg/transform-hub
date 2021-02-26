import { ReadableStream } from "./utils";

export type StreamsConfig = [
    stdin: ReadableStream<string>, // standard input stream piped to runner
    stdout: WritableStream<string>, // standard output stream piped pulled from runner
    stderr: WritableStream<string>, // standard error stream piped from runner - with loggers etc.
    monitor: WritableStream<string>, // the monitoring stream piped from runner with info on the sequence state
    control: ReadableStream<string>, // the contol stream piped to runner that controls the sequence (kills etc)
    input?: ReadableStream<string>, // optional input stream piped from runner - if none passed, `this.stdin` will be used
    output?: WritableStream<string> // optional output stream piped to runner - if none passed, `this.stdout` will be used
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
