import { Readable, Writable } from "stream";

export interface InputDriver {
    text(value: string): Promise<void>;
    bytes(value: Buffer): Promise<void>;
    ndjson(value: unknown[]): Promise<void>;
    stream(value: NodeJS.ReadableStream, options: { contentType: string }): Promise<void>;
    end(): Promise<void>;
}

function writeChunk(target: Writable, chunk: Buffer | string): Promise<void> {
    return new Promise((resolveWrite, rejectWrite) => {
        function onError(error: Error): void {
            rejectWrite(error);
        }

        function onDrain(): void {
            target.off("error", onError);
            resolveWrite();
        }

        target.once("error", onError);

        if (target.write(chunk)) {
            target.off("error", onError);
            resolveWrite();
            return;
        }

        target.once("drain", onDrain);
    });
}

function writeHeader(target: Writable, contentType: string): Promise<void> {
    return writeChunk(target, `content-type: ${contentType}\r\n\r\n`);
}

export function createInputDriver(target: Writable): InputDriver {
    let ended = false;
    let headerWritten = false;

    const writePayload = async (contentType: string, payload: Buffer | string): Promise<void> => {
        if (!headerWritten) {
            await writeHeader(target, contentType);
            headerWritten = true;
        }

        await writeChunk(target, payload);
    };

    const end = (): Promise<void> => {
        if (ended || target.writableEnded) {
            ended = true;
            return Promise.resolve();
        }

        ended = true;

        return new Promise(resolveEnd => {
            target.end(() => resolveEnd());
        });
    };

    return {
        text: (value: string) => writePayload("text/plain", value),
        bytes: (value: Buffer) => writePayload("application/octet-stream", value),
        ndjson: (value: unknown[]) => writePayload(
            "application/x-ndjson",
            value.map(item => JSON.stringify(item)).join("\r\n") + "\r\n"
        ),
        stream: async (value: NodeJS.ReadableStream, options: { contentType: string }) => {
            if (!headerWritten) {
                await writeHeader(target, options.contentType);
                headerWritten = true;
            }

            const source = value as Readable;

            await new Promise<void>((resolveStream, rejectStream) => {
                source.on("data", chunk => {
                    target.write(chunk);
                });
                source.once("error", rejectStream);
                source.once("end", resolveStream);
            });
        },
        end
    };
}
