import { strict as assert } from "assert";
import { exec, spawn } from "child_process";
import { StringStream } from "scramjet";
import { stdout } from "process";

const hostOneExecutableFilePath = "../dist/host-one/bin/start-host-one.js";

export class HostOneUtils {
    hostOneProcessStopped = false;

    async executeSequence(packagePath: string, args: string[], cmdTimeout: number, outputFile?: string) {
        await new Promise(async (resolve, reject) => {
            //TODO package.json is app config, so should be optional in my opinion
            const cmdBase = `node ${hostOneExecutableFilePath} ${packagePath} package.json ${args}`;
            const cmd = outputFile ? cmdBase + `> ${outputFile}` : cmdBase;

            exec(cmd, { timeout: cmdTimeout }, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(1);
            });
        });
    }

    executeSequenceSpawn(packagePath: string, args?: string[]): void {
        let command: string[] = ["node", hostOneExecutableFilePath, packagePath];

        command = command.concat(args);

        const hostOne = spawn("/usr/bin/env", command);

        this.hostOneProcessStopped = false;
        //for debugging purposes
        StringStream.from(hostOne.stdout).pipe(stdout);

        hostOne.on("exit", (code, signal) => {
            console.log("sequence process exited with code: ", code, " and signal: ", signal);
            this.hostOneProcessStopped = true;

            if (code === 1) {
                assert.fail();
            }
        });
    }
}
