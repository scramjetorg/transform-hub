import { ReadableStream, WritableStream } from "../utils";

export type GetTopicsResponse = Record<
    string,
    {
        contentType: string,
        stream: ReadableStream<any> | WritableStream<any>
    }
>
