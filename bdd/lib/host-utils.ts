import { strict as assert } from "assert";
import { exec, spawn } from "child_process";
import { StringStream } from "scramjet";
import { stdout } from "process";

const hostExecutableFilePath = "../dist/host/bin/start.js";

export class HostUtils {
    hostProcessStopped = false;

    async execHost(outputFile?: string) {
        await new Promise(async (resolve, reject) => {
            const cmdBase = `node ${hostExecutableFilePath}`;
            const cmd = outputFile ? cmdBase + `> ${outputFile}` : cmdBase;

            exec(cmd, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(1);
            });
        });
    }

    async stopHost() {
        await new Promise(async (resolve, reject) => {

            const cmd = "kill -9 $(lsof -t -i:8000)";

            exec(cmd, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(1);
            });
        });
    }

    spawnHost() {
        const command: string[] = ["node", hostExecutableFilePath];
        const host = spawn("/usr/bin/env", command);

        this.hostProcessStopped = false;
        //for debugging purposes
        StringStream.from(host.stdout).pipe(stdout);
        StringStream.from(host.stderr).pipe(stdout);

        host.on("exit", (code, signal) => {
            console.log("sequence process exited with code: ", code, " and signal: ", signal);
            this.hostProcessStopped = true;

            if (code === 1) {
                assert.fail();
            }
        });
    }
}
