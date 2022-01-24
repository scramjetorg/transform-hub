import { ObjLogger } from "@scramjet/obj-logger";
import { BufferStream, DataStream, StringStream } from "scramjet";

import { Readable } from "stream";

const objLogger = new ObjLogger("@sth/runner/inputStram");

function loopStream<T extends unknown>(
    stream: Readable,
    iter: (chunk: Buffer) => { action: "continue" } | { action: "end", data: T, unconsumedData?: Buffer }
): Promise<T> {
    return new Promise((res, rej) => {
        const onReadable = () => {
            let chunk;

            while ((chunk = stream.read()) !== null) {
                const result = iter(chunk);

                if (result.action === "continue") {
                    continue;
                }

                stream.off("error", rej);
                stream.off("readable", onReadable);
                if (result.unconsumedData?.length) {
                    stream.unshift(result.unconsumedData);
                }

                res(result.data);
                break;
            }
        };

        stream.on("error", rej);

        // run it in case readable was already triggered
        onReadable();
        stream.on("readable", onReadable);
    });
}

const HEADERS_ENDING_SEQ = "\r\n\r\n";

/**
 *
 * @param stream readable stream
 * @returns object with header key/values (header names are lower case)
 */
export function readInputStreamHeaders(stream: Readable): Promise<Record<string, string>> {
    let buffer = "";

    return loopStream<Record<string, string>>(stream, (chunk) => {
        const str = chunk.toString("utf-8");

        buffer += str;

        const headEndSeqIndex = buffer.indexOf(HEADERS_ENDING_SEQ);

        if (headEndSeqIndex === -1) {
            return { action: "continue" };
        }

        const rawHeaders = buffer.slice(0, headEndSeqIndex);
        const bodyBeginning = buffer.slice(headEndSeqIndex + HEADERS_ENDING_SEQ.length);
        const headersMap: Record<string, string> = rawHeaders
            .split("\r\n")
            .map(headerStr => headerStr.split(": "))
            .reduce((obj, [key, val]) => ({ ...obj, [key.toLowerCase()]: val }), {});

        objLogger.debug("Headers", { action: "end", data: headersMap });
        return { action: "end", data: headersMap, unconsumedData: Buffer.from(bodyBeginning, "utf8") };
    });
}

export function mapToInputDataStream(stream: Readable, contentType: string): DataStream {
    objLogger.debug("Content-Type", contentType);

    if (contentType === undefined) {
        throw new Error("Content-Type is undefined");
    }

    if (contentType.endsWith("x-ndjson")) {
        // @TODO: Read charset from headers
        return StringStream
            .from(stream, { encoding: "utf-8" })
            .JSONParse(true);
    } else if (contentType === "text/plain") {
        return StringStream.from(stream, { encoding: "utf-8" });
    } else if (contentType === "application/octet-stream") {
        return BufferStream.from(stream);
    }

    throw new Error(`Content-Type does not match any supported value. The actual value is ${contentType}`);
}
