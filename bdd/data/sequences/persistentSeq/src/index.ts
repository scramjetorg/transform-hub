import { TransformApp } from "@scramjet/types";
// import BackupingStream from "./backupingStream";
// import { resolve } from "path";
import { PassThrough } from "stream";

const mod: TransformApp = async (input) => {
    // const backupFile = resolve(process.cwd(), "./backupingFile");
    // const backupingStream = new BackupingStream(backupFile);
    console.log("instance running");
    const backupingStream = new PassThrough({ highWaterMark: 0 });

    // setTimeout(() => () => {
    //     console.log("WRITE from instance");
    //     backupingStream.write("1234");
    // }, 6000);

    input.pipe(backupingStream);

    // backupingStream.on("data", (chunk: any) => {
    //     console.log(chunk.toString());
    // }).pause();

    // setInterval(() => {
    //     console.log("isPaused:", backupingStream.isPaused());
    // }, 100);

    backupingStream.on("pause", () => { console.log("pause from instance"); });
    backupingStream.on("resume", () => { console.log("resume from instance"); });
    return backupingStream;
};

export default mod;
