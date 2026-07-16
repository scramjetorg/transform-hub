import path = require("path");
import { spawn, ChildProcess } from "child_process";
import { strict as assert } from "assert";
import { ClientUtils } from "@scramjet/client-utils";
import { prettyPrint } from "@scramjet/obj-logger";
import { StringStream } from "scramjet";
import { Readable } from "stream";

const { stopProcess: stopProcessWithCleanup } = require("../../../scripts/lib/bdd-cleanup.js");
const { getOwnership } = require("../../lib/ownership.js");
const ownership = getOwnership(process.env);

async function requestGet(apiBase: string, apiEndpoint: string): Promise<{[key: string]: any}> {
    const utils = new ClientUtils(apiBase);
    try {
        return await utils.get<any>(apiEndpoint);
    } finally {
        utils.dispose();
    }
}

async function requestPost(
    apiBase: string, apiEndpoint: string, body: string | {[key: string]: any}
): Promise<{[key: string]: any}> {
    const utils = new ClientUtils(apiBase);
    const parsedBody = body.length > 0 ? JSON.parse(body as string) : body;

    try {
        return await utils.post<any>(apiEndpoint, parsedBody, {}, { json: true, parse: "json" });
    } finally {
        utils.dispose();
    }
}

function disposeClient(client: any): void {
    if (!client) return;
    if (typeof client.dispose === "function") {
        client.dispose();
        return;
    }
    client.client?.dispose?.();
}

function getExecutableCmd(packageName: string): string[] {
    const sourcePath = `../packages/${ packageName }/src/bin/start.ts`;
    const builtPath = `../dist/${ packageName }/bin/start.js`;

    return process.env.SCRAMJET_SPAWN_TS
        ? ["npx", "ts-node", path.resolve(process.cwd(), sourcePath)]
        : ["node", path.resolve(process.cwd(), builtPath)];
}

function spawnProcess(
    command: string[],
    options: {[key: string]: any},
    waitMS = 0,
    stdoutDoneMatch?: string,
    spawnOptions: { detached?: boolean } = {},
    lifecycle?: {
        ownChild: (child: ChildProcess, label: string, options?: { group?: boolean }) => void;
        ready?: (child: ChildProcess) => void;
    }
): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
        const fullCommand = [...command];

        for (const [name, value] of Object.entries(options)) {
            fullCommand.push(name, value);
        }

        const cmdProcess = spawn("/usr/bin/env", fullCommand, {
            detached: spawnOptions.detached === true,
            env: {
                ...process.env,
                SCRAMJET_BDD_RUN_ID: ownership.runId,
                SCRAMJET_BDD_CHUNK_ID: ownership.chunkId,
                SCRAMJET_BDD_OWNER: ownership.owner,
            },
        });

        const label = command.length > 0 ? command[command.length - 1] : "spawned";
        // ScenarioLifecycle is the sole owner/tracking path for manager
        // children. Tracking here as well duplicates exit listeners and can
        // leak unexpected-exit evidence into later scenarios.
        lifecycle?.ownChild(cmdProcess, `manager:${label}`, { group: true });

        const MAX_STDOUT_BUFFER = 64 * 1024;
        let stdoutBuffer = "";
        let settled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const finishFailure = async (reason: string) => {
            if (settled) return;
            settled = true;
            if (timer) clearTimeout(timer);
            cmdProcess.stdout?.off("data", onStdout);
            cmdProcess.off("error", onError);
            cmdProcess.off("exit", onExit);
            if (cmdProcess.exitCode === null && cmdProcess.signalCode === null) {
                try {
                    await stopProcessWithCleanup(cmdProcess, { graceMs: 1000 });
                } catch (error) {
                    reason += `; cleanup failed: ${(error as Error).message}`;
                }
            }
            reject(new Error(`${reason}; stdout tail: ${JSON.stringify(stdoutBuffer)}`));
        };

        const onStdout = (data: any) => {
            stdoutBuffer = `${stdoutBuffer}${data.toString()}`.slice(-MAX_STDOUT_BUFFER);
            if (stdoutDoneMatch && stdoutBuffer.includes(stdoutDoneMatch) && !settled) {
                settled = true;
                if (timer) clearTimeout(timer);
                cmdProcess.stdout?.off("data", onStdout);

                lifecycle?.ready?.(cmdProcess);
                setTimeout(() => resolve(cmdProcess), waitMS);
            }
        };
        const onError = (error: Error) => {
            void finishFailure(`Child process error before readiness: ${error.message}`);
        };
        const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
            if (!settled) void finishFailure(`Child process exited before readiness (code=${code}, signal=${signal})`);
        };

        if (stdoutDoneMatch) {
            cmdProcess.stdout.on("data", onStdout);
        } else {
            timer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    resolve(cmdProcess);
                }
            }, waitMS);
        }

        if (stdoutDoneMatch) {
            timer = setTimeout(() => {
                void finishFailure(`Timed out waiting for readiness marker ${JSON.stringify(stdoutDoneMatch)}`);
            }, 15000);
        }

        cmdProcess.once("error", onError);
        cmdProcess.once("exit", onExit);

        cmdProcess.stdout?.pipe(process.stdout);
        cmdProcess.stderr?.pipe(process.stderr);
    });
}

/**
 * Gracefully stop a child process with TERM‑to‑KILL escalation.
 *
 * 1. Sends SIGTERM to the process.
 * 2. Waits up to `graceMs` (default 10000) for it to exit.
 * 3. If still alive, sends SIGKILL.
 *
 * @param childProcess  The ChildProcess to stop.
 * @param graceMs       Grace period in ms before SIGKILL (default 10000).
 * @returns             Resolves when the process has exited.
 */
function stopProcess(childProcess: ChildProcess, graceMs = 10000): Promise<void> {
    return stopProcessWithCleanup(childProcess, { graceMs }).then(() => undefined);
}

function parseOptions(options: string): {[key: string]: any} {
    return options
        .split("--")
        .filter(optionStr => optionStr.length > 0)
        .map(optionStr => optionStr.split(" "))
        .reduce((result: {[key: string]: any}, optionArr) => {
            result[`--${optionArr[0].trim()}`] = optionArr[1].trim();
            return result;
        }, {});
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

function parseExpectedData(data: string) {
    const expectedData: { data: {[key: string]: any}, fields: string[]} = {
        data: {},
        fields: []
    };

    if (data.startsWith("{") && data.endsWith("}")) {
        expectedData.data = JSON.parse(data) as {[key: string]: any};
    } else if (data.startsWith("[")) {
        expectedData.data = JSON.parse(data.slice(1, -1)) as {[key: string]: any};
    } else {
        expectedData.fields = data.split(",");
    }

    return expectedData;
}

function assertResponseData(response: {[key: string]: any}, expectedResponse: string) {
    const expectedData = parseExpectedData(expectedResponse);

    if (expectedData.fields.length === 0) {
        Object.entries(expectedData.data).forEach(entry => {
            if (!(response[entry[0]] && response[entry[0]] === entry[1])) {
                assert.fail(
                    `Response does not contain expected data of "${entry[0]}: ${[entry[1]]}". ` +
                    `But contains "${entry[0]}: ${response[entry[0]]}" instead.`);
            }
        });
    } else {
        expectedData.fields.forEach(field => {
            if (response[field] === undefined) {
                assert.fail(`Response does not contain field "${field}".`);
            }
        });
    }
}

function displayColorLogs(resp: Readable) {
    const parser = prettyPrint({ colors: true });

    StringStream.from(resp)
        .lines()
        .parse(x => {
            try {
                return JSON.parse(x);
            } catch {
                return undefined;
            }
        })
        .stringify(parser)
        .pipe(process.stdout);
}

export {
    displayColorLogs,
    requestGet,
    requestPost,
    getExecutableCmd,
    spawnProcess,
    stopProcess,
    parseOptions,
    sleep,
    assertResponseData,
    disposeClient
};
