import { HostClient } from "@scramjet/api-client";
import { strict as assert } from "assert";
import { ChildProcess, spawn } from "child_process";
import { SIGTERM } from "constants";
import { StringDecoder } from "string_decoder";

const hostExecutableCommand = process.env.SCRAMJET_SPAWN_TS
    ? ["npx", "ts-node", "../packages/sth/src/bin/hub.ts"]
    : ["node", "../dist/sth/bin/hub.js"]
;

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

        if (!this.host?.kill(SIGTERM)) {
            throw new Error("Couldn't stop host");
        }
    }

    async spawnHost() {
        if (this.hostUrl) {
            console.error("Host is supposedly running at", this.hostUrl);
            const hostClient = new HostClient(this.hostUrl);

            assert.equal(
                (await hostClient.getLoadCheck()).status, // TODO: change to version and log it
                200,
                "Remote host doesn't respond"
            );
            // TODO: Consider this, but needs testing.
            // if (process.env.SCRAMJET_TEST_LOG) {
            //     (await hostClient.getLogStream()).data?.pipe(process.stderr);
            // }

            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            const command: string[] = hostExecutableCommand;

            if (process.env.LOCAL_HOST_PORT) command.push("-P", process.env.LOCAL_HOST_PORT);
            if (process.env.LOCAL_HOST_SOCKET_PATH) command.push("-S", process.env.LOCAL_HOST_SOCKET_PATH);
            if (process.env.SCRAMJET_TEST_LOG) console.error("Spawning with command:", ...command);

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
