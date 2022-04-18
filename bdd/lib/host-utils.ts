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
            (await new HostClient(this.hostUrl).getLoadCheck()).currentLoad,
            200,
            "Remote host doesn't respond"
        );
    }

    async getHostStatus() {
        return (await new HostClient(this.hostUrl).getLoadCheck()).currentLoad;
    }

    async stopHost() {
        if (this.hostUrl) {
            return;
        }

        if (!this.host?.kill(SIGTERM)) {
            throw new Error("Couldn't stop host");
        }
    }

    async spawnHost(...extraArgs: any[]): Promise<string> {
        if (this.hostUrl) {
            // eslint-disable-next-line no-console
            console.error("Host is supposedly running at", this.hostUrl);
            const hostClient = new HostClient(this.hostUrl);

            const { version } = await hostClient.getVersion();

            assert.ok(typeof version === "string");

            return Promise.resolve("");
        }

        return new Promise<string>((resolve) => {
            const command: string[] = [...hostExecutableCommand];

            if (process.env.LOCAL_HOST_PORT) command.push("-P", process.env.LOCAL_HOST_PORT);
            if (process.env.LOCAL_HOST_INSTANCES_SERVER_PORT) command.push("--instances-server-port", process.env.LOCAL_HOST_INSTANCES_SERVER_PORT);
            if (process.env.CPM_URL) command.push("-C", process.env.CPM_URL);
            if (process.env.RUNTIME_ADAPTER) command.push(`--runtime-adapter=${process.env.RUNTIME_ADAPTER}`);
            if (process.env.SCRAMJET_TEST_LOG) {
                // eslint-disable-next-line no-console
                console.log("Spawning with command:", ...command);
            }

            if (extraArgs.length) command.push(...extraArgs);

            const hub = this.host = spawn("/usr/bin/env", command);

            this.hostProcessStopped = false;

            if (process.env.SCRAMJET_TEST_LOG) {
                hub.stdout?.pipe(process.stdout);
                hub.stderr?.pipe(process.stderr);
            }

            const decoder = new StringDecoder();

            const listener = (data: Buffer) => {
                const decodedData = decoder.write(data);

                if (decodedData.match(/API on/)) {
                    hub.stdout?.off("data", listener);
                    resolve(decodedData);
                }
            };

            hub.stdout?.on("data", listener);

            this.host.on("exit", (code, signal) => {
                // eslint-disable-next-line no-console
                console.log("host process exited with code: ", code, " and signal: ", signal);
                this.hostProcessStopped = true;

                if (code === 1) {
                    assert.fail();
                }
            });
        });
    }
}
