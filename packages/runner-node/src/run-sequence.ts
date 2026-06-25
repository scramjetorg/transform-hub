import { Readable, Writable } from "stream";
import { BufferStream, DataStream, StringStream } from "scramjet";

import { RunnerError } from "@scramjet/model";
import { RunnerMessageCode } from "@scramjet/symbols";
import { IObjectLogger, SynchronousStreamable } from "@scramjet/runtime-types";
import { PangMessageData } from "@scramjet/runtime-types";

import { MessageUtils } from "./message-utils";

type Primitives = string | number | boolean | void | null;

/**
 * Mirrors the legacy `isSynchronousStreamable` check: a streamable value
 * is anything that is not a primitive (string/number/boolean/undefined/null).
 */
export function isSynchronousStreamable(
    obj: SynchronousStreamable<any> | Primitives
): obj is SynchronousStreamable<any> {
    return !["string", "number", "boolean", "undefined", "null"].includes(typeof obj);
}

/**
 * Subset of the host client surface that {@link runSequence} actually touches.
 * Mirrors the legacy `hostClient.outputStream` and `hostClient.monitorStream`
 * usage so we can drive the runtime from runner-node without rewiring transports.
 */
export interface RunSequenceHostClient {
    readonly outputStream: Writable & { setDefaultEncoding(encoding: BufferEncoding): unknown };
    readonly monitorStream: Writable;
}

/**
 * Dependencies required to execute a sequence with parity to the legacy
 * `Runner.runSequence` (packages/runner/src/runner.ts:846-993).
 *
 * `context` is the value passed as `this` to each sequence function.
 * `inputDataStream` seeds the first function's `instanceOutput` argument.
 * `outputDataStream` is used as the serialization sink (legacy `this.outputDataStream`).
 * `hostClient` exposes the raw `outputStream`/`monitorStream` byte channels.
 * `args` are forwarded after `instanceOutput` to every function in the sequence.
 */
export interface RunSequenceDeps {
    context: unknown;
    inputDataStream: DataStream;
    outputDataStream: DataStream;
    hostClient: RunSequenceHostClient;
    args?: unknown[];
    logger?: IObjectLogger;
    onStatusChange?: (status: "RUNNING" | "ERRORED") => void;
}

type SequenceFunction = (this: unknown, instanceOutput: unknown, ...args: unknown[]) => unknown;

function sendPang(monitorStream: Writable, payload: PangMessageData): void {
    MessageUtils.writeMessageOnStream(
        [RunnerMessageCode.PANG, payload],
        monitorStream
    );
}

/**
 * Port of the legacy `Runner.runSequence` (lines 846-993) into runner-node.
 *
 * Preserves call shape `func.call(context, instanceOutput, ...args)`, intermediate
 * stream chaining, primitive last-value handling, the contentType-driven
 * serialization decision (ndjson / generic DataStream) and the duplicate PANG
 * write on stream output (first via `sendPang`, then with `outputEncoding` via
 * `MessageUtils.writeMessageOnStream`).
 */
export async function runSequence(
    sequence: SequenceFunction[],
    deps: RunSequenceDeps
): Promise<void> {
    const { context, inputDataStream, outputDataStream, hostClient } = deps;
    const args = deps.args ?? [];
    const logger = deps.logger;
    const setStatus = deps.onStatusChange ?? (() => { /* noop */ });

    let instanceOutput: SynchronousStreamable<any> | Readable | undefined = inputDataStream;
    let intermediate: SynchronousStreamable<any> | void = inputDataStream;
    let itemsLeftInSequence = sequence.length;

    for (const func of sequence) {
        itemsLeftInSequence--;
        const idx = sequence.length - itemsLeftInSequence - 1;

        let out: ReturnType<SequenceFunction>;

        try {
            logger?.debug("Processing function on index", idx);
            setStatus("RUNNING");
            out = func.call(context, instanceOutput, ...args);
            logger?.debug("Function called", idx);
        } catch (error) {
            logger?.error("Function errored", idx + 1, (error as Error)?.stack);
            setStatus("ERRORED");
            throw new RunnerError("SEQUENCE_RUNTIME_ERROR", error);
        }

        if (itemsLeftInSequence > 0) {
            intermediate = (await out) as SynchronousStreamable<any> | void;
            logger?.info("Function output type", idx, typeof out);

            if (!intermediate) {
                logger?.error("Sequence ended premature");
                setStatus("ERRORED");
                throw new RunnerError("SEQUENCE_ENDED_PREMATURE");
            } else if (typeof intermediate === "object" && intermediate instanceof DataStream) {
                logger?.debug("Sequence function returned DataStream.", idx);
                instanceOutput = intermediate;
            } else {
                logger?.debug("Sequence function returned readable", idx);
                instanceOutput = DataStream.from(intermediate as Readable);
            }
        } else {
            logger?.info("All Sequences processed.");
            intermediate = (await out) as SynchronousStreamable<any> | void;

            if (intermediate instanceof Readable) {
                instanceOutput = intermediate;
            } else if (intermediate !== undefined && isSynchronousStreamable(intermediate)) {
                const wrapped = DataStream.from(intermediate as Readable, { highWaterMark: 0 });

                instanceOutput = Object.assign(wrapped, {
                    topic: (intermediate as SynchronousStreamable<any>).topic,
                    contentType: (intermediate as SynchronousStreamable<any>).contentType,
                });
            } else {
                instanceOutput = undefined;
            }

            logger?.debug("Stream type is", typeof instanceOutput);
        }
    }

    await new Promise<void>((res, rej) => {
        const settled = intermediate as SynchronousStreamable<any> | Primitives;

        if (!isSynchronousStreamable(settled)) {
            logger?.info("Primitive returned as last value");
            hostClient.outputStream.end(`${intermediate as unknown as Primitives}`);
            sendPang(hostClient.monitorStream, { provides: "", contentType: "" });
            res();
            return;
        }

        if (instanceOutput && hostClient.outputStream) {
            const output = instanceOutput as Readable & {
                contentType?: string;
                topic?: string;
                readableEncoding?: BufferEncoding | null;
            };

            logger?.info("Piping Sequence output", typeof instanceOutput);

            const shouldSerialize =
                (output.contentType !== undefined &&
                    ["application/x-ndjson", "text/x-ndjson"].includes(output.contentType)) ||
                (output instanceof DataStream &&
                    !(output instanceof StringStream || output instanceof BufferStream));

            if (!shouldSerialize && output.readableEncoding) {
                hostClient.outputStream.setDefaultEncoding(output.readableEncoding);
            }

            logger?.info("Will Output be serialized?", shouldSerialize);
            logger?.info("Stream encoding is", output.readableEncoding);

            output
                .on("error", (e: Error) => {
                    logger?.error("Sequence output stream error", e);
                    setStatus("ERRORED");
                    rej(new RunnerError("SEQUENCE_RUNTIME_ERROR", e));
                })
                .once("end", () => {
                    logger?.info("Sequence stream ended");
                    res();
                })
                .pipe(shouldSerialize ? outputDataStream : hostClient.outputStream);

            const provides =
                (intermediate as SynchronousStreamable<any>).topic || "";
            const contentType =
                (intermediate as SynchronousStreamable<any>).contentType || "";

            sendPang(hostClient.monitorStream, { provides, contentType });
            MessageUtils.writeMessageOnStream(
                [
                    RunnerMessageCode.PANG,
                    {
                        provides,
                        contentType,
                        outputEncoding: output.readableEncoding,
                    },
                ],
                hostClient.monitorStream
            );
        } else {
            logger?.info("Sequence did not output a stream");
            res();
        }
    });
}
