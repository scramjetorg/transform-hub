import { createReadStream, Stats, fstat, fstatSync, Dir, WriteStream, createWriteStream, openSync, watch } from "fs";
import { Duplex, DuplexOptions } from "stream";

type BackupingStreamOptions = Pick<DuplexOptions, "encoding">

class BackupingStream extends Duplex {
    readonly backupDir: Dir;
    private writeStream: WriteStream;
    private bytesRead;
    private size: number;
    private fd: number;
    // private readStream: ReadStream;

    constructor(backupDir: Dir, opts?: BackupingStreamOptions) {
        super({ ...opts, highWaterMark: 0 });
        const backupFilePath = `${backupDir.path}/tmp1`;

        this.backupDir = backupDir;
        this.fd = openSync(backupFilePath, "w+");
        this.bytesRead = 0;
        this.size = fstatSync(this.fd).size;
        this.writeStream = createWriteStream("", { fd: this.fd, encoding: opts?.encoding, autoClose: false });
        this.attachBackupReadableEvent(this.fd, backupFilePath);

        this.on("backupReadable", async () => {
            this.pushFromBackup();
        });
    }
    _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void) {
        if (this.canSkipBackup()) {
            this.push(chunk, encoding);
            callback();
            return;
        }
        this.createBackup(chunk, callback);
    }
    _read(_size: number) { }

    canSkipBackup() { return this.readableFlowing === true && this.backupIsEmpty(); }
    bytesInBackup() { return this.writeStream.bytesWritten - this.bytesRead; }
    backupIsEmpty() { return this.bytesInBackup() <= 0; }

    createBackup(chunk: any, callback: (error?: Error | null | undefined) => void) {
        this.writeStream.write(chunk, callback);
    }

    private attachBackupReadableEvent(fd: number, backupFilePath: string) {
        watch(backupFilePath, { persistent: false }, (event) => {
            if (event !== "change") return;
            fstat(fd, (err, stats: Stats) => {
                if (this.size === stats.size) return;
                this.size = stats.size;
                this.emit("backupReadable");
            });
        });
    }

    private pushFromBackup(size?: number) {
        const readStream = createReadStream("", { fd: this.fd, autoClose: false, start: this.bytesRead })
            .on("readable", () => {
                let chunk;

                while ((chunk = readStream.read(size)) !== null) {
                    if (!this.push(chunk)) break;
                }
            });
    }
}

export default BackupingStream;
