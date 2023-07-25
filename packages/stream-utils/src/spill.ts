/* eslint-disable no-async-promise-executor */
import { randomUUID } from "crypto";
import { readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { Duplex, DuplexOptions } from "stream";

export type SpillStorage<T> = AsyncGenerator<T, unknown>;

export type SpillStreamOptions<T> = DuplexOptions & {
    storageDir?: string;
    highWaterMark?: 0;
    readableHighWaterMark?: 0;
    writableHighWaterMark?: 0;
    spillMark?: number;
    spillSize?: number;
    storage?: SpillStorage<T>;
}

type Writables = Buffer|string;

const MEGABYTE = 1024 * 1024;
const HEXADECAMESSAGES = 1024 * 1024;

type StoredChunk = {
    file: string;
    encoding: BufferEncoding;
    length: number;
};
type MemoryChunk<T> = {
    chunk: T;
    encoding: BufferEncoding;
};

function sumChunks(chunks: MemoryChunk<Writables>[]) {
    return chunks.reduce((sum, ch) => sum + ch.chunk.length, 0);
}

export class SpillStream extends Duplex { // todo: make work with objects if storage given
    private storageDir: string;

    public spillMark: number;
    public spillSize: number;

    private _queue: MemoryChunk<Writables>[] = [];
    private _queueLength: number = 0;

    private _spilledQueue: StoredChunk[] = [];

    private _reading: boolean = false;
    private _spilling: boolean = false;

    constructor({ spillMark, spillSize, storageDir, ...options }:
        SpillStreamOptions<Writables>) {
        const duplexOptions = { ...options, readableHighWaterMark: 0, writableHighWaterMark: 0 };

        super(duplexOptions);
        this.spillMark = spillMark || Infinity;
        this.storageDir = storageDir || join(tmpdir(), randomUUID());
        this.spillSize = spillSize || options.objectMode ? HEXADECAMESSAGES : MEGABYTE;
    }

    get spilling() {
        if (this._spilling) return true;

        return this._queueLength > this.spillSize;
    }

    pause() {
        this._spilling = true;
        super.pause();
        return this;
    }

    resume() {
        this._spilling = false;
        super.resume();
        return this;
    }

    async _writev(
        chunks: MemoryChunk<Writables>[],
        callback: (error?: Error | null | undefined) => void
    ): Promise<void> {
        this._queue.push(...chunks);

        if (this.writableObjectMode)
            this._queueLength += sumChunks(chunks);
        else
            this._queueLength += chunks.length;

        await this.spill();
        callback();
    }

    private async spill(): Promise<void> {
        if (!this.spilling) return;

        // eslint-disable-next-line no-constant-condition
        while (this._queueLength > this.spillSize) {
            const chunksToSpill = this._queue.splice(0, this.spillSize);

            this._spilledQueue.push(await this.createStoredChunk(chunksToSpill));
            this._queueLength -= sumChunks(chunksToSpill);
        }
    }

    async createStoredChunk(chunks: MemoryChunk<Writables>[]): Promise<StoredChunk> {
        const file = join(this.storageDir, `${randomUUID()}.stored`);
        const buf = Buffer.concat(chunks.map(chunk => Buffer.from(chunk.chunk)));

        await writeFile(file, buf);
        return { length: buf.length, file, encoding: chunks[0].encoding };
    }

    async _read() {
        if (this._reading) return;
        this._reading = true;

        while (this._spilledQueue.length) {
            const chunk: StoredChunk = this._spilledQueue.shift() as StoredChunk;
            const read = await this.readSpilled(chunk);

            if (!this.push(read)) {
                this._reading = false;
                return;
            }
        }

        while (this._queue.length) {
            const chunk = this._queue.shift() as MemoryChunk<Writables>;

            if (!this.push(chunk)) break;
        }

        this._reading = false;
    }

    private async readSpilled(chunk: StoredChunk): Promise<Writables> {
        return await readFile(chunk.file, { encoding: chunk.encoding });
    }
}

