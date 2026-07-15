import fs from "fs";
import { strict as assert } from "assert";
import { promisify } from "util";
import { exec, spawn } from "child_process";
import { PassThrough, Readable } from "stream";
import { getLogger } from "@scramjet/logger";
const { getBddConfigPath } = require("./bdd-config.js");

const isLogActive = process.env.SCRAMJET_TEST_LOG;
const lineByLine = require("n-readlines");
const testPath = "../dist/samples/example/";
const timeoutShortMs = 100;
const timeoutLongMs = 300;

const logger = getLogger("test");
const { spawnOwnedProcess } = require("./spawn-owned-process.js") as {
    spawnOwnedProcess: (command: string, args: string[], options?: {
        env?: NodeJS.ProcessEnv;
        timeoutMs?: number;
        successMarker?: string;
        onStdout?: (output: string, write: (value: string) => void) => void;
    }) => Promise<void>;
};
export { spawnOwnedProcess };

export const defer = (timeout: number): Promise<void> => new Promise((res) => setTimeout(res, timeout));
export const { waitForCondition } = require("./readiness.js") as {
    waitForCondition: <T>(check: () => Promise<T> | T, isReady: (value: T) => boolean, options?: { timeoutMs?: number; intervalMs?: number; description?: string }) => Promise<T>;
};

export function getSiCommand(options: { useBddConfig?: boolean } = {}) {
    if (process.env.SCRAMJET_SPAWN_JS && process.env.SCRAMJET_SPAWN_TS) {
        throw Error("Both SCRAMJET_SPAWN_JS and SCRAMJET_SPAWN_TS env set");
    }

    let si = ["si"];

    if (process.env.SCRAMJET_SPAWN_JS) {
        si = ["node", "../dist/cli/bin"];
    }

    if (process.env.SCRAMJET_SPAWN_TS) {
        si = ["npx", "tsx", "../packages/cli/src/bin/index.ts"];
    }

    if (options.useBddConfig === false) {
        return si;
    }

    return [...si, "-c", getBddConfigPath()];
}

const si = getSiCommand();

export async function file1ContainsLinesFromFile2(file1: any, greeting: any, file2: any, suffix: any) {
    const output = new lineByLine(`${file1}`);
    const input = JSON.parse(await promisify(fs.readFile)(`${testPath}${file2}`, "utf8"));

    let line1;
    let line2;
    let i = 0;

    for (i; i < input.length && (line2 = output.next()); i++) {
        line1 = input[i].name;
        assert.equal(greeting + line1 + suffix, "" + line2);
    }

    assert.equal(i, input.length, "incorrect number of elements compared");
}

export const waitForValueTillTrue = async (valueToCheck: boolean, timeoutMs = 4000) => {
    const startTime: number = Date.now();

    while (valueToCheck && Date.now() - startTime < timeoutMs) {
        await defer(timeoutShortMs);
    }
};

export const callInLoopTillExpectedCode = async (
    fnToCall: any,
    that: any,
    expectedHttpCode: number = 200
): Promise<any> => {
    let response;

    const startTime: number = Date.now();
    const timeout: number = timeoutLongMs;

    do {
        response = await fnToCall.call(that);
        await defer(timeout);
    } while (response?.status !== expectedHttpCode && Date.now() - startTime < 10000);

    return response;
};

export function fileContains(filename: any, key: any) {
    const stdoutFile = new lineByLine(filename);

    let line;

    while (line = stdoutFile.next()) {
        if (line.includes(key)) {
            return;
        }
    }

    assert.fail("stdout does not contain: " + key);
}

export const callInLoopTillExpectedStatusCode = async (
    fnToCall: any,
    that: any,
    expectedHttpCode: number = 200,
    ...args: any[]
) => {
    let response;

    const startTime: number = Date.now();
    const timeout: number = timeoutLongMs;

    do {
        response = await fnToCall.call(that, ...args);
        await defer(timeout);
    } while (response?.statusCode !== expectedHttpCode && Date.now() - startTime < 10000);

    return response;
};

export async function streamToString(_stream: Readable): Promise<string> {
    const chunks = [];
    const stream = new PassThrough({ encoding: "utf-8" });

    _stream.pipe(stream);

    for await (const chunk of stream) chunks.push(chunk);

    return chunks.join("");
}

export async function getOccurenceNumber(searchedValue: any, filePath: any) {
    try {
        console.log(`${JSON.stringify(searchedValue)}`);
        return Number(
            (await promisify(exec)(`sudo grep -oa ${JSON.stringify(searchedValue)}  ${filePath} | wc -l`)).stdout
        );
    } catch {
        return 0;
    }
}

export async function getOccurenceFileNumber(filePath: string) {
    try {
        return Number((await promisify(exec)(`sudo test -f ${filePath} && echo $? | wc -l `)).stdout);
    } catch {
        return 0;
    }
}

export async function removeFile(filePath: any) {
    try {
        return Number((await promisify(exec)(`sudo rm -v ${filePath} | wc -l`)).stdout);
    } catch {
        return 0;
    }
}

export async function getStreamsFromSpawn(
    command: string,
    options: string[],
    env: NodeJS.ProcessEnv = process.env
): Promise<[string, string, any]> {
    if (process.env.SCRAMJET_TEST_LOG) {
        console.error("Spawning command", command, ...options);
    }

    const child = spawn(command, options, {
        env
    });
    const [stdout, stderr, statusCode] = await Promise.all([
        streamToString(child.stdout),
        streamToString(child.stderr),
        new Promise((res, rej) => {
            child.on("error", rej);
            child.on("exit", res);
        })
    ]).catch((error: any) => {
        console.error("Error in spawn", error);
        throw error;
    });

    if (process.env.SCRAMJET_TEST_LOG) {
        console.error("Exit command", { statusCode }, command, ...options);
    }

    return [stdout, stderr, statusCode];
}

export async function getStreamsFromSpawnSuccess(
    command: string,
    options: string[],
    env: NodeJS.ProcessEnv = process.env
): Promise<[string, string]> {
    const [stdout, stderr, code] = await getStreamsFromSpawn(command, options, env);

    if (process.env.SCRAMJET_TEST_LOG) {
        console.error("Results", { stdout, stderr });
    }

    if (code) throw new Error(`Non zero exit code: ${code}`);

    return [stdout, stderr];
}

export function removeBoundaryQuotes(str: string) {
    if (str.charAt(0) === '"' && str.charAt(str.length - 1) === '"') {
        return str.substr(1, str.length - 2);
    }
    return str;
}

export async function waitUntilStreamContains(stream: Readable, expected: string, timeout = 30000): Promise<boolean> {
    let response = "";
    const piped = stream.pipe(new PassThrough({ encoding: undefined }));
    try {
        return await Promise.race([
            (async () => {
                for await (const chunk of piped) {
                    response = `${response}${chunk.toString()}`;

                    console.log("\nData received: ", response);
                    if (response.includes(expected)) return true;
                }
                throw new Error("End of stream reached");
            })(),
            defer(timeout).then(() => { throw new Error(`Stream did not contain ${JSON.stringify(expected)} before timeout`); })
        ]);
    } finally {
        piped.destroy();
        stream.destroy();
    }
}

export async function waitUntilStreamEquals(stream: Readable, expected: string, timeout = 10000): Promise<string> {
    let response = "";
    const piped = stream.pipe(new PassThrough({ encoding: "utf-8" }));
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    try {
        await Promise.race([
            (async () => {
                for await (const chunk of piped) {
                    response += chunk;

                    console.log(response, chunk);

                    if (response === expected) return expected;
                    if (response.length >= expected.length) {
                        return assert.equal(response, expected);
                    }
                }
                throw new Error("End of stream reached");
            })(),
            new Promise<void>((_, reject) => {
                timeoutHandle = setTimeout(() => reject(new Error(`Stream did not equal ${JSON.stringify(expected)} before timeout`)), timeout);
            })
        ]);
    } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        piped.destroy();
        stream.destroy();
    }

    return response;
}

export async function getActiveProfile() {
    try {
        const res = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "profile", "ls"]);

        const match = res[1].match(/->\s*([^\n]+)/);
        const activeProfile = match ? match[1].trim() : null;

        if (isLogActive) {
            logger.log("Active profile:", activeProfile);
        }
        return activeProfile;
    } catch (error: any) {
        logger.error(`Error while getting the active profile: ${error.message}`);
        return "";
    }
}

export async function createProfile(profileName: string = "test_bdd") {
    const res = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "profile", "create", profileName]);

    if (isLogActive) {
        logger.debug(res);
    }
}

export async function setProfile(profileName: string = "test_bdd") {
    const res = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "profile", "use", profileName]);

    if (isLogActive) {
        logger.debug(res);
    }
}

export async function removeProfile(profileName: string) {
    const res = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "profile", "remove", profileName]);

    if (isLogActive) {
        logger.debug(res);
    }
}

export function createDirectory(workingDirectory: string) {
    if (!fs.existsSync(workingDirectory)) {
        fs.mkdirSync(workingDirectory);
        if (isLogActive) {
            logger.debug(`Directory "${workingDirectory}" successfully created`);
        }
    } else {
        logger.error(`Directory "${workingDirectory}" already exist`);
    }
}

export function deleteDirectory(workingDirectory: string) {
    try {
        fs.rmdirSync(workingDirectory, { recursive: true });
        if (isLogActive) {
            logger.debug(`Directory "${workingDirectory}" was successfully deleted`);
        }
    } catch (error: any) {
        logger.error(`Error while deleting direcory "${workingDirectory}": ${error.message}`);
    }
}

export function spawnSiInit(
    command: string,
    templateType: string,
    workingDirectory: string,
    env: NodeJS.ProcessEnv = process.env
) {
    const args = [...si, "init", "seq", templateType, "-p", workingDirectory];
    const bddEnv = {
        ...env,
        npm_config_audit: "false",
        npm_config_fund: "false",
        npm_config_update_notifier: "false",
        npm_config_maxsockets: "1",
        NODE_OPTIONS: `${env.NODE_OPTIONS || ""} --max-old-space-size=512`.trim(),
    };
    if (isLogActive) logger.debug("Spawning command: /usr/bin/env", ...args);
    let promptsAnswered = 0;
    let confirmationAnswered = false;
    return spawnOwnedProcess(command, args, {
        env: bddEnv,
        successMarker: "Sequence template succesfully created",
        timeoutMs: 30_000,
        onStdout: (output, write) => {
            if (output.includes("Sequence template succesfully created")) return;
            const promptCount = (output.match(/(?:package name|version|description|entry point|test command|git repository|keywords|author|license):/gi) || []).length;
            if (promptCount > promptsAnswered) {
                const unanswered = promptCount - promptsAnswered;
                promptsAnswered = promptCount;
                write("\n".repeat(unanswered));
            }
            if (!confirmationAnswered && /Is this OK\?/i.test(output)) {
                write("yes\n");
                confirmationAnswered = true;
            }
        },
    });
}

export async function waitUntilStreamStartsWith(stream: Readable, expected: string, timeout = 10000): Promise<string> {
    let response = "";

    await Promise.race([
        (async () => {
            for await (const chunk of stream.pipe(new PassThrough({ encoding: undefined }))) {
                response += chunk.toString();

                if (response === expected) return expected;
                if (response.length >= expected.length) {
                    return assert.equal(response.substring(0, expected.length), expected);
                }
            }
            throw new Error("End of stream reached");
        })(),
        defer(timeout).then(() => { assert.equal(response, expected, "timeout"); })
    ]);

    return response;
}

/**
 * Checks whether an error represents a transient connection failure that should
 * be retried.  Recognises bare Node.js system error codes (ECONNREFUSED, etc.),
 * ClientError wrapper code CANNOT_CONNECT, and nested reason.code from the
 * underlying QueryError.
 *
 * The nested reason is only consulted when the top-level .code is absent,
 * ensuring HTTP/server errors (e.g. SERVER_ERROR, NOT_FOUND) are never
 * misidentified as connection errors through a coincidental reason.code match.
 *
 * @param err - caught error object (any shape with optional .code / .reason)
 * @returns true when the error is a retryable connection error
 */
export function isConnectionError(err: any): boolean {
    if (!err) return false;

    const connectionErrors = new Set([
        "ECONNREFUSED", "ECONNRESET", "ECONNABORTED", "ETIMEDOUT", "ENOTFOUND",
        "CANNOT_CONNECT"
    ]);

    // Direct match on top-level code (handles bare Node.js system errors
    // and ClientError codes including CANNOT_CONNECT).
    if (err.code && connectionErrors.has(err.code)) return true;

    // Defense-in-depth: check nested reason.code when the top-level code
    // is absent — covers edge cases where a wrapper error lacks .code but
    // the underlying reason carries the system error code.
    if (!err.code && err.reason?.code && connectionErrors.has(err.reason.code)) return true;

    return false;
}

/**
 * Calls `loadCheckFn` with bounded retry for transient connection errors,
 * supporting the "host is running" and "host is still running" BDD steps.
 *
 * Retries when {@link isConnectionError} returns true, within a configurable
 * window (default 5 seconds) with configurable backoff (default 200ms).
 * Non-connection errors (e.g. SERVER_ERROR) are thrown immediately.
 * On deadline exhaustion, throws `lastError` preserving the final diagnostic
 * error, or a new Error with `exhaustedMsg`.
 *
 * The `deadlineMs` and `backoffMs` parameters are exposed for testing;
 * production callers use the defaults.
 *
 * @param loadCheckFn - async function performing the load check call
 * @param exhaustedMsg - error message when the deadline is exhausted
 * @param deadlineMs - retry window in milliseconds (default 5000)
 * @param backoffMs - pause between retries in milliseconds (default 200)
 */
export async function retryLoadCheck(
    loadCheckFn: () => Promise<any>,
    exhaustedMsg: string,
    deadlineMs: number = 5_000,
    backoffMs: number = 200
): Promise<void> {
    const deadline = Date.now() + deadlineMs;
    let lastError: any;

    do {
        try {
            const result = await loadCheckFn();
            assert.ok(result);
            return;
        } catch (err: any) {
            lastError = err;

            if (!isConnectionError(err)) {
                // Non-connection error — fail immediately so diagnostics
                // from the host are not swallowed.
                throw err;
            }

            if (Date.now() >= deadline) break;
            await defer(backoffMs);
        }
    } while (Date.now() < deadline);

    // Exhausted deadline — preserve the final diagnostic error.
    throw lastError || new Error(exhaustedMsg);
}

export function isTemplateCreated(templateType: string, workingDirectory: string) {
    return new Promise<boolean>((resolve, reject) => {
        fs.readdir(workingDirectory, (err, files) => {
            if (err) {
                logger.error(`Can not read from directory: ${workingDirectory}`);
                reject(err);
                return;
            }
            if (
                templateType === "ts" &&
                files.includes("index.ts") &&
                files.includes("package.json") &&
                files.includes("tsconfig.json")
            ) {
                resolve(true);
            }
            if (
                templateType === "py" &&
                files.includes("main.py") &&
                files.includes("package.json") &&
                files.includes("requirements.txt")
            ) {
                resolve(true);
            }
            if (templateType === "js" && files.includes("index.js") && files.includes("package.json")) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}
