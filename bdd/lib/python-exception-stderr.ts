import { strict as assert } from "assert";
import { Readable } from "stream";

export const PYTHON_EXCEPTION_MARKER = "TestException: This exception should appear on stderr";
export const MAX_STDERR_BYTES = 256 * 1024;
export const ROLLING_SUFFIX_BYTES = 4096;

export type StderrDiagnostic = {
    markerFound: boolean;
    byteCount: number;
    rollingSuffix: string;
};

/** Consume one stderr stream to EOF without retaining its complete output. */
export async function assertPythonExceptionOnStderr(
    input: Readable | Promise<Readable>,
    marker = PYTHON_EXCEPTION_MARKER,
    maxBytes = MAX_STDERR_BYTES,
): Promise<StderrDiagnostic> {
    assert.ok(Number.isSafeInteger(maxBytes) && maxBytes > 0, "stderr byte budget must be a positive safe integer");

    let stream: Readable | undefined;
    let byteCount = 0;
    let markerFound = false;
    let rollingSuffix = "";
    let oversized = false;

    const consume = async (source: Readable): Promise<void> => await new Promise((resolve, reject) => {
        const onData = (chunk: Buffer | string) => {
            const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
            byteCount += Buffer.byteLength(text);
            oversized ||= byteCount > maxBytes;
            rollingSuffix = (rollingSuffix + text).slice(-ROLLING_SUFFIX_BYTES);
            markerFound ||= rollingSuffix.includes(marker);
        };
        const cleanup = () => {
            source.removeListener("data", onData);
            source.removeListener("end", onEnd);
            source.removeListener("error", onError);
        };
        const onEnd = () => { cleanup(); resolve(); };
        const onError = (error: Error) => { cleanup(); reject(error); };
        source.on("data", onData);
        source.once("end", onEnd);
        source.once("error", onError);
    });

    try {
        stream = await input;
        await consume(stream);
        if (oversized) throw new Error(`Python stderr exceeded the ${maxBytes}-byte budget after ${byteCount} bytes`);
        if (!markerFound) throw new Error(`Python stderr did not contain the expected exception marker; ${byteCount} bytes read; suffix=${JSON.stringify(rollingSuffix)}`);
        return { markerFound, byteCount, rollingSuffix };
    } finally {
        stream = undefined;
        byteCount = 0;
        markerFound = false;
        rollingSuffix = "";
        oversized = false;
    }
}
