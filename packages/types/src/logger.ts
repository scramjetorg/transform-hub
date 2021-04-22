import { WritableStream } from "./utils";

export type LoggerOutput = {
    /** Output stream */
    out: WritableStream<any>;
    /** Errror stream */
    err?: WritableStream<any>;
}

export type LoggerOptions = {
    /** Should we show callsites to show originating line */
    useCallsite?: boolean;
};

export type Logger = Console;
