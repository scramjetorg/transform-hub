import { TransformApp } from "@scramjet/types";
// import BackupingStream from "./backupingStream";
// import { resolve } from "path";
import { PassThrough } from "stream";

const mod: TransformApp = async (input) => {
    // const backupFile = resolve(process.cwd(), "./backupingFile");
    // const backupingStream = new BackupingStream(backupFile);
    const backupingStream = new PassThrough();

    input.pipe(backupingStream);

    backupingStream.on("pause", () => { console.log("inn isntance pause"); });
    backupingStream.on("resume", () => { console.log("inn isntance resume"); });
    return backupingStream;
};

export default mod;
