import { TransformApp } from "@scramjet/types";
import { open } from "fs/promises";
import { PassThrough } from "stream";

const mod: TransformApp = async (input) => {
    const output = new PassThrough({ highWaterMark: 0 });
    const backupDir = process.cwd();
    const backupFile = `${backupDir}/tmp1`;
    const writeHandle = await open(backupFile, "w");
    const readHandle = await open(backupFile, "r");
    let backupBytesWritten = 0;
    let backupBytesRead = 0;

    input.on("readable", async () => {
        let chunk;

        while ((chunk = input.read()) !== null) {
            if (backupBytesWritten - backupBytesRead === 0) {
                output.write(chunk);
            } else {
                const { bytesWritten } = await writeHandle.write(chunk, 0, undefined, backupBytesWritten);

                backupBytesWritten += bytesWritten;
            }
        }
    });
    output.on("drain", async () => {
        const dataInBackup = backupBytesWritten - backupBytesRead;

        while (dataInBackup > 0) {
            const { bytesRead, buffer } = await readHandle.read(Buffer.alloc(100), 0, 100, backupBytesRead);

            backupBytesRead += bytesRead;
            output.write(buffer);
        }
    });

    return output;
};

export default mod;
