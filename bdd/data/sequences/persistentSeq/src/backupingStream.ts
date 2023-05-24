import { openSync, readSync, writeSync } from "fs";
import { Duplex, DuplexOptions } from "stream";

type BackupingStreamOptions = Pick<DuplexOptions, "encoding" | "highWaterMark" | "readableHighWaterMark" | "writableHighWaterMark">

class BackupingStream extends Duplex {
    writeFd: number;
    readFd: number;
    bytesWritten: number;
    bytesRead: number;
    readonly backupFile: string;

    constructor(backupFile: string, opts?: BackupingStreamOptions) {
        super({ ...opts });
        this.backupFile = backupFile;
        this.writeFd = openSync(this.backupFile, "w+");
        this.readFd = openSync(this.backupFile, "r");
        this.bytesWritten = 0;
        this.bytesRead = 0;
    }

    get bytesInBackup() { return this.bytesWritten - this.bytesRead; }

    _write(chunk: any, encoding: BufferEncoding,
        callback: (error?: Error | null | undefined) => void): void {
        if (this.bytesInBackup <= 0 && this.readableFlowing === true) {
            this.push(chunk, encoding);
            callback();
            this.resetBackupFile();
            return;
        }
        const bytesWritten = this.writeBackup(chunk, encoding);

        this.bytesWritten += bytesWritten;
        callback();
    }

    _read(size: number): void {
        if (this.bytesInBackup <= 0) return;

        this.pushFromBackupToInternalBuffer(size);
    }

    resume(): this {
        this.pushFromBackupToInternalBuffer(this.readableHighWaterMark);
        return super.resume();
    }

    protected writeBackup(chunk: any, encoding: BufferEncoding) {
        if (typeof chunk === "string") {
            return writeSync(this.writeFd, chunk, this.bytesWritten, encoding);
        }
        return writeSync(this.writeFd, chunk, 0, undefined, this.bytesWritten);
    }

    protected pushFromBackupToInternalBuffer(size: number) {
        const sizeInBuffer = this.readableHighWaterMark - this.readableLength;
        const readSize = Math.min(size, sizeInBuffer);
        const buffer = Buffer.alloc(readSize);
        const bytesRead = readSync(this.readFd, buffer, 0, readSize, this.bytesRead);

        this.bytesRead += bytesRead;
        this.push(buffer.subarray(0, bytesRead));
    }

    protected resetBackupFile() {
        if (this.bytesWritten <= 0 || this.bytesWritten !== this.bytesRead) return;
        this.bytesWritten = 0;
        this.bytesRead = 0;
        this.writeFd = openSync(this.backupFile, "w+");
    }
}

export default BackupingStream;
