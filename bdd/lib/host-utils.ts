import { HostClient } from "@scramjet/api-client";
import { strict as assert } from "assert";
import { ChildProcess, spawn } from "child_process";
import { once } from "events";
import { SIGKILL, SIGTERM } from "constants";
import { StringDecoder } from "string_decoder";
import { memoryRegistry } from "../lib/memory-registry";
const { getOwnership } = require("./ownership.js");

const hostExecutableCommand = process.env.SCRAMJET_SPAWN_TS
    ? ["/usr/bin/env", "npx", "tsx", "../packages/sth/src/bin/hub.ts"]
    : ["node", "../dist/sth/bin/hub.js"]
;

type NoDefault = ("port"|"instances-server-port"|"cpm-url"|"runtime-adapter"|"instance-lifetime-extension-delay")[];
type CleanupSignal = "SIGHUP" | "SIGINT" | "SIGTERM";
const signals: CleanupSignal[] = ["SIGHUP", "SIGINT", "SIGTERM"];
const signalExitCode: Record<CleanupSignal, number> = {
    SIGHUP: 129,
    SIGINT: 130,
    SIGTERM: 143
};
const configuredMaxOutputBytes = Number(process.env.SCRAMJET_TEST_OUTPUT_MAX_BYTES);
const MAX_OUTPUT_BYTES = Number.isFinite(configuredMaxOutputBytes) && configuredMaxOutputBytes > 0
    ? configuredMaxOutputBytes
    : 1024 * 1024;
const ownership = getOwnership(process.env);

export class HostUtils {
    private static cleanupHandlersInstalled = false;
    private static hosts = new Set<ChildProcess>();

    hostProcessStopped = false;
    host?: ChildProcess;
    expectedExitCode?: number;
    output = "";

    /**
     * When true, the Hub is being deliberately stopped (via stopHost or
     * scenario-lifecycle cleanup) so the startup-exit assertion must not fire.
     * Set via markStopExpected().
     */
    expectedStop = false;

    hostUrl: string;

    constructor() {
        this.hostUrl = process.env.SCRAMJET_HOST_URL || "";
    }

    /**
     * Mark the Hub stop as expected, so the startup-exit assertion in the
     * 'exit' handler does not fire.  Call before any deliberate stop
     * (stopHost or scenario-lifecycle cleanup).
     */
    markStopExpected() {
        this.expectedStop = true;
    }

    async check() {
        const client = new HostClient(this.hostUrl);
        try {
            assert.equal((await client.getLoadCheck()).currentLoad, 200, "Remote host doesn't respond");
        } finally {
            client.dispose();
        }
    }

    async getHostStatus() {
        const client = new HostClient(this.hostUrl);
        try {
            return (await client.getLoadCheck()).currentLoad;
        } finally {
            client.dispose();
        }
    }

    async stopHost() {
        if (this.hostUrl) {
            return;
        }

        if (!this.host) {
            throw new Error("Couldn't stop host");
        }

        if (this.hostProcessStopped) {
            return;
        }

        this.markStopExpected();

        const host = this.host;

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Timed out waiting for host to stop"));
            }, 11000);

            host.once("exit", () => {
                clearTimeout(timeout);
                resolve();
            });

            // Use TERM-to-KILL escalation with default 10s grace period.
            if (!HostUtils.killProcessGroup(host, SIGTERM, 10000)) {
                clearTimeout(timeout);
                reject(new Error("Couldn't stop host"));
            }
        });
        await HostUtils.disposeChildIO(host);
        this.output = "";
    }

    /**
     * Send a signal to a child's process group.
     *
     * Provides TERM‑to‑KILL escalation: when `signal` is SIGTERM and the
     * process is still alive after `escalateMs`, a SIGKILL is sent to the
     * same process group.
     *
     * @param child        ChildProcess to signal.
     * @param signal       Signal name or number (default SIGTERM).
     * @param escalateMs   Grace period before SIGKILL (default 0 = no escalation).
     * @returns            True if the signal was sent (or process already gone).
     */
    static killProcessGroup(
        child: ChildProcess,
        signal: NodeJS.Signals | number = SIGTERM,
        escalateMs = 0
    ): boolean {
        if (!child.pid) {
            return false;
        }

        const doKill = (sig: NodeJS.Signals | number): boolean => {
            try {
                process.kill(-child.pid!, sig);
                return true;
            } catch (error) {
                const code = (error as NodeJS.ErrnoException).code;

                if (code === "ESRCH") {
                    return true;
                }

                return child.kill(sig);
            }
        };

        const sent = doKill(signal);

        if (signal === SIGTERM && escalateMs > 0 && sent) {
            // Schedule escalation to SIGKILL after the grace period.
            const timer = setTimeout(() => {
                try {
                    process.kill(-child.pid!, SIGKILL);
                } catch {
                    // process already gone — fine
                }
            }, escalateMs);

            // Cancel escalation if the process exits on its own.
            child.once("exit", () => clearTimeout(timer));
        }

        return sent;
    }

    private static cleanup(signal: NodeJS.Signals | number = SIGTERM) {
        const escalate = signal === SIGTERM ? 10000 : 0;

        for (const host of HostUtils.hosts) {
            HostUtils.killProcessGroup(host, signal, escalate);
        }
    }

    private static async disposeChildIO(child: ChildProcess): Promise<void> {
        const streams = [child.stdout, child.stderr].filter(Boolean) as NodeJS.ReadableStream[];
        for (const stream of streams) stream.removeAllListeners();
        child.removeAllListeners("error");
        for (const stream of streams) {
            const closed = (stream as any).destroyed
                ? Promise.resolve()
                : once(stream as any, "close").then(() => undefined);
            (stream as any).destroy?.();
            await closed;
        }
    }

    private static installCleanupHandlers() {
        if (HostUtils.cleanupHandlersInstalled) {
            return;
        }

        HostUtils.cleanupHandlersInstalled = true;
        process.once("exit", () => HostUtils.cleanup(SIGTERM));

        for (const signal of signals) {
            process.once(signal, () => {
                HostUtils.cleanup(signal);
                process.exit(signalExitCode[signal]);
            });
        }
    }

    private static trackHost(host: ChildProcess) {
        HostUtils.installCleanupHandlers();
        HostUtils.hosts.add(host);
        host.once("exit", () => {
            HostUtils.hosts.delete(host);
            void HostUtils.disposeChildIO(host);
        });
    }

    async spawnHost(ommit: NoDefault, ...extraArgs: any[]): Promise<string> {
        if (this.hostUrl) {
            console.error("Host is supposedly running at", this.hostUrl);
            const hostClient = new HostClient(this.hostUrl);

            const { version } = await hostClient.getVersion();

            assert.ok(typeof version === "string");

            return Promise.resolve("");
        }

        return new Promise<string>((resolve) => {
            const command: string[] = [...hostExecutableCommand];

            this.setArgs(command, extraArgs, ommit);

            const hub = this.host = spawn("/usr/bin/env", command, {
                detached: true,
                env: {
                    ...process.env,
                    SCP_ENV_VALUE: "GH_CI",
                    SCRAMJET_BDD_RUN_ID: ownership.runId,
                    SCRAMJET_BDD_CHUNK_ID: ownership.chunkId,
                    SCRAMJET_BDD_OWNER: ownership.owner,
                }
            });
            HostUtils.trackHost(hub);
            memoryRegistry.trackChildProcess(hub, `hub:${ownership.owner}`);

            this.hostProcessStopped = false;

            if (process.env.SCRAMJET_TEST_LOG) {
                hub.stdout?.pipe(process.stdout);
                hub.stderr?.pipe(process.stderr);
            }

            const decoder = new StringDecoder();
            const outputListener = (data: Buffer) => {
                this.output = (this.output + data.toString()).slice(-MAX_OUTPUT_BYTES);
            };

            let decodedData = "";
            const listener = (data: Buffer) => {
                const last = decoder.write(data);

                decodedData += last;

                if (decodedData.includes("Host running!")) {
                    hub.stdout?.off("data", listener);

                    // Record readiness-aware RSS baseline for chunk summary (Phase 10).
                    if (hub.pid) {
                        memoryRegistry.recordProcessReady(hub.pid);
                    }

                    resolve(decodedData);
                }
            };

            hub.stdout?.on("data", outputListener);
            hub.stderr?.on("data", outputListener);
            hub.stdout?.on("data", listener);

            this.host.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
                console.log("host process exited with code: ", code, " and signal: ", signal);
                this.hostProcessStopped = true;

                // Skip startup-failure assertion when the Hub is being
                // deliberately stopped (stopHost or scenario-lifecycle
                // cleanup).  The expectedStop flag is set by markStopExpected()
                // before any intentional termination.
                if (code === 1 && this.expectedExitCode !== 1 && !this.expectedStop) {
                    assert.fail();
                }

                // Resolve with partial output when the host exits with an expected
                // non-zero code before "Host running!" — required for scenarios that
                // reproduce startup failures (e.g. runner port collision).
                if (this.expectedExitCode !== undefined && code !== null &&
                    code !== 0 && code === this.expectedExitCode) {
                    resolve(decodedData);
                }
            });
        });
    }

    setArgs(command: string[], extraArgs: string[], noDefault: NoDefault = []) {
        if (!noDefault.includes("port") && !extraArgs.includes("-P") && !extraArgs.includes("--port") && !command.includes("--port") && process.env.LOCAL_HOST_PORT)
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
            // Keep the Python runner image flag aligned with the image built from packages/runner-python/Dockerfile.
            command.push(
                `--runner-image=scramjetorg/runner:${process.env.RUNNER_IMGS_TAG}`,
                `--prerunner-image=scramjetorg/pre-runner:${process.env.RUNNER_IMGS_TAG}`,
                `--runner-py-image=scramjetorg/runner-py:${process.env.RUNNER_IMGS_TAG}`
            );
        }

        if (process.env.SCRAMJET_TEST_LOG) {
            console.log("Spawning with command:", ...command);
        }
    }
}
