import { FileHandle, open } from "fs/promises";
import { Duplex, DuplexOptions } from "stream";

type BackupingStreamOptions = Pick<DuplexOptions, "encoding" | "highWaterMark">

class BackupingStream extends Duplex {
    private writeHandle: FileHandle;
    private readHandle: FileHandle;
    bytesWritten: number;
    bytesRead: number;
    readonly backupFile: string;

    private constructor(backupFile: string, writeHandle: FileHandle,
        readHandle: FileHandle, opts?: BackupingStreamOptions) {
        super({ ...opts });
        this.backupFile = backupFile;
        this.writeHandle = writeHandle;
        this.bytesWritten = 0;
        this.bytesRead = 0;
        this.readHandle = readHandle;
    }

    static async create(backupDir: string, opts?: BackupingStreamOptions) {
        const backupFile = `${backupDir}/tmp1`;
        const backupWrite = await open(backupFile, "w");
        const backupRead = await open(backupFile, "r");

        return new BackupingStream(backupFile, backupWrite, backupRead, opts);
    }

    async _write(chunk: any, encoding: BufferEncoding,
        callback: (error?: Error | null | undefined) => void): Promise<void> {
        if (this.bytesInBackup() <= 0 && this.readableLength < this.readableHighWaterMark) {
            this.push(chunk, encoding);
            callback();
            return;
        }
        try {
            const { bytesWritten } = await this.writeBuckup(chunk, encoding);

            this.bytesWritten += bytesWritten;
            callback();
        } catch (err: any) {
            callback(err);
        }
    }
    async _read(size: number): Promise<void> {
        if (this.bytesInBackup() <= 0) return;

        const { bytesRead, buffer } = await this.readHandle.read(Buffer.alloc(size), 0, size, this.bytesRead);

        this.bytesRead += bytesRead;
        this.push(buffer.subarray(0, bytesRead));
    }

    bytesInBackup() { return this.bytesWritten - this.bytesRead; }

    writeBuckup(chunk: any, encoding: BufferEncoding) {
        if (typeof chunk === "string") {
            return this.writeHandle.write(chunk, this.bytesWritten, encoding);
        }
        return this.writeHandle.write(chunk, 0, undefined, this.bytesWritten);
    }

    async close() {
        return Promise.all([this.writeHandle.close(), this.readHandle.close()]);
    }
}

export default BackupingStream;
