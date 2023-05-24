import { TransformApp } from "@scramjet/types";
import { PassThrough } from "stream";
import BackupingStream from "./backupingStream";
import { resolve } from "path";

const mod: TransformApp = async (input) => {
    const backupFile = resolve(process.cwd(), "./backupingFile");
    const backupingStream = new BackupingStream(backupFile);
    const output = new PassThrough();

    input.pipe(backupingStream).pipe(output);

    return output;
};

export default mod;
