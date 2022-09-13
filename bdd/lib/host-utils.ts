import { HostClient } from "@scramjet/api-client";
import { strict as assert } from "assert";
import { ChildProcess, spawn } from "child_process";
import { SIGTERM } from "constants";
import path from "path";
import { StringDecoder } from "string_decoder";

const hostExecutableCommand = process.env.SCRAMJET_SPAWN_TS
    ? [path.resolve(require.resolve("ts-node"), "../bin.js"), "../packages/sth/src/bin/hub.ts"]
    : ["node", "../dist/sth/bin/hub.js"]
;

type NoDefault = ("port"|"instances-server-port"|"cpm-url"|"runtime-adapter"|"instance-lifetime-extension-delay")[];

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

    async spawnHost(ommit: NoDefault, ...extraArgs: any[]): Promise<string> {
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

            this.setArgs(command, extraArgs, ommit);

            const hub = this.host = spawn("/usr/bin/env", command, { ...process.env, SCP_ENV_VALUE: "GH_CI" });

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

    // eslint-disable-next-line complexity
    private setArgs(command: string[], extraArgs: string[], noDefault: NoDefault = []) {
        if (!noDefault.includes("port") && !extraArgs.includes("-P") && !command.includes("--port") && process.env.LOCAL_HOST_PORT)
            command.push("-P", process.env.LOCAL_HOST_PORT);
        if (!noDefault.includes("instances-server-port") && !extraArgs.includes("--instances-server-port") && process.env.LOCAL_HOST_INSTANCES_SERVER_PORT)
            command.push("--instances-server-port", process.env.LOCAL_HOST_INSTANCES_SERVER_PORT);
        if (!noDefault.includes("cpm-url") && !extraArgs.includes("-C") && !command.includes("--cpm-url") && process.env.CPM_URL)
            command.push("-C", process.env.CPM_URL);
        if (!noDefault.includes("runtime-adapter") && !extraArgs.includes("--runtime-adapter") && process.env.RUNTIME_ADAPTER)
            command.push(`--runtime-adapter=${process.env.RUNTIME_ADAPTER}`);
        if (!noDefault.includes("instance-lifetime-extension-delay") && !extraArgs.includes("--instance-lifetime-extension-delay") && process.env.RUNTIME_ADAPTER)
            command.push("--instance-lifetime-extension-delay=100");
        if (extraArgs.length) command.push(...extraArgs);

        if (process.env.RUNNER_IMGS_TAG) {
            command.push(
                `--runner-image=scramjetorg/runner:${process.env.RUNNER_IMGS_TAG}`,
                `--prerunner-image=scramjetorg/pre-runner:${process.env.RUNNER_IMGS_TAG}`,
                `--runner-py-image=scramjetorg/runner-py:${process.env.RUNNER_IMGS_TAG}`
            );
        }

        if (process.env.SCRAMJET_TEST_LOG) {
            // eslint-disable-next-line no-console
            console.log("Spawning with command:", ...command);
        }
    }
}
