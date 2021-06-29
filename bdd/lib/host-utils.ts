import { HostClient } from "@scramjet/api-client";
import { strict as assert } from "assert";
import { ChildProcess, spawn } from "child_process";
import { SIGTERM } from "constants";
import { StringDecoder } from "string_decoder";

const hostExecutableFilePath = "../dist/host/bin/start.js";

export class HostUtils {
    hostProcessStopped = false;
    host?: ChildProcess;

    hostUrl: string;

    constructor() {
        this.hostUrl = process.env.SCRAMJET_HOST_URL || "";
    }

    async check() {
        assert.equal(
            (await new HostClient(this.hostUrl).getLoadCheck()).status,
            200,
            "Remote host doesn't respond"
        );
    }

    async getHostStatus() {
        return (await new HostClient(this.hostUrl).getLoadCheck()).status;
    }

    async stopHost() {
        if (this.hostUrl) {
            return;
        }

        await new Promise<void>(async (resolve, reject) => {
            if (this.host?.kill(SIGTERM)) {
                resolve();
            } else {
                reject();
            }
        });
    }

    async spawnHost() {
        if (this.hostUrl) {
            console.error("Host is supposedly running at", this.hostUrl);

            assert.equal(
                (await new HostClient(this.hostUrl).getLoadCheck()).status, // TODO: change to version and log it
                200,
                "Remote host doesn't respond"
            );

            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            console.error("Spawning host...");

            const command: string[] = ["node", hostExecutableFilePath];

            this.host = spawn("/usr/bin/env", command);

            this.hostProcessStopped = false;

            if (process.env.SCRAMJET_TEST_LOG) {
                this.host?.stdout?.pipe(process.stdout);
                this.host?.stderr?.pipe(process.stderr);
            }

            const decoder = new StringDecoder();

            this.host?.stdout?.on("data", (data) => {
                const decodedData = decoder.write(data);

                if (decodedData.match(/API listening on port/)) {
                    resolve();
                }
            });

            this.host.on("exit", (code, signal) => {
                console.log("sequence process exited with code: ", code, " and signal: ", signal);
                this.hostProcessStopped = true;

                if (code === 1) {
                    assert.fail();
                }
            });
        });

    }
}
