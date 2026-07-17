#!/usr/bin/env bun

import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { Readable } from "stream";
import { parseBootConfigPathFromArgv, readBootConfig, RunnerBunBootConfig } from "../boot-config";

interface RunnerNodeEntry {
    entry: string;
    needsTsNode: boolean;
}

function resolveRunnerNodeEntry(): RunnerNodeEntry {
    const pkgJson = require.resolve("@scramjet/runner-node/package.json");
    const pkgRoot = dirname(pkgJson);
    const srcEntry = resolve(pkgRoot, "src/bin/runner-node.ts");

    try {
        const pkg = JSON.parse(readFileSync(pkgJson, "utf8"));

        if (typeof pkg.main === "string" && pkg.main.includes("src/") && existsSync(srcEntry)) {
            return { entry: srcEntry, needsTsNode: true };
        }
    } catch {
        // Fall through to compiled/source probing.
    }

    // Published/prebuilt workspace packages expose the compiled bin directly
    // from their package root (`dist/runner-node/bin/...`), while a source
    // checkout may resolve the package root to `packages/runner-node`.
    const compiledCandidates = [resolve(pkgRoot, "bin/runner-node.js"), resolve(pkgRoot, "dist/bin/runner-node.js")];

    for (const compiled of compiledCandidates) {
        if (existsSync(compiled)) return { entry: compiled, needsTsNode: false };
    }

    if (existsSync(srcEntry)) {
        return { entry: srcEntry, needsTsNode: true };
    }

    throw new Error(`runner-bun: cannot resolve runner-node entry under ${pkgRoot}`);
}

function runRunnerNode(bootConfigPath: string): Promise<number> {
    const resolved = resolveRunnerNodeEntry();
    const env: NodeJS.ProcessEnv = { ...process.env };

    delete env.SEQUENCE_PATH;
    delete env.SEQUENCE_INFO;
    delete env.RUNNER_CONNECT_INFO;

    if (resolved.needsTsNode) {
        env.NODE_OPTIONS = [env.NODE_OPTIONS, "--require ts-node/register/transpile-only"].filter(Boolean).join(" ");
    }

    const child = spawn(process.env.NODE_BIN || "node", [resolved.entry, bootConfigPath], {
        env,
        stdio: ["inherit", "inherit", "inherit", "ipc", "inherit", "inherit"]
    });

    return new Promise((resolveCode, reject) => {
        const forwardSignal = (signal: NodeJS.Signals) => {
            child.kill(signal);
        };
        const cleanupSignals = () => {
            process.off("SIGINT", forwardSignal);
            process.off("SIGTERM", forwardSignal);
        };

        process.on("SIGINT", forwardSignal);
        process.on("SIGTERM", forwardSignal);
        child.once("error", (error) => {
            cleanupSignals();
            reject(error);
        });
        child.once("close", (code, signal) => {
            cleanupSignals();
            if (typeof code === "number") {
                resolveCode(code);
                return;
            }

            reject(new Error(`runner-bun: delegated runner-node exited by signal ${signal ?? "unknown"}`));
        });
    });
}

function serializeError(error: unknown): unknown {
    if (!(error instanceof Error)) return error;

    const data = (error as Error & { data?: unknown }).data;

    return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        data: serializeError(data)
    };
}

function formatErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return JSON.stringify(error);
}

function logRuntimeError(phase: "sequence-load" | "instance-runtime", bootConfig: RunnerBunBootConfig, error: unknown): void {
    console.error(`STH runtime error phase=${phase} runtime=bun sequenceId=${bootConfig.sequenceInfo?.id} instanceId=${bootConfig.instanceId} error=${formatErrorMessage(error)}`, {
        phase,
        runtime: "bun",
        sequenceId: bootConfig.sequenceInfo?.id,
        instanceId: bootConfig.instanceId,
        sequencePath: bootConfig.sequencePath,
        error: serializeError(error)
    });
}

export async function bootstrap(): Promise<number> {
    const bootConfigPath = parseBootConfigPathFromArgv(process.argv);

    // Validate with Bun-specific error messages before delegating to the
    // protocol-compatible Node runtime implementation. This keeps runner-bun's
    // boot contract explicit while allowing Bun to execute the TS runtime entry.
    const bootConfig = readBootConfig(bootConfigPath);

    if (bootConfig.instancesServerPort === undefined && bootConfig.instancesServerHost === undefined) {
        if ((bootConfig.appConfig as Record<string, unknown> | undefined)?.requiresAppContext === true) {
            throw new Error("runner-bun: direct Bun cannot provide AppContext; hosted Bun delegates to runner-node");
        }

        let loaded: unknown;

        try {
            loaded = require(bootConfig.sequencePath);
        } catch (err) {
            logRuntimeError("sequence-load", bootConfig, err);
            throw err;
        }

        const candidate = (loaded as { default?: unknown })?.default ?? loaded;
        const initializer =
            typeof loaded === "object" && loaded !== null
                ? ((loaded as { initialize?: unknown }).initialize ??
                  (typeof candidate === "object" && candidate !== null ? (candidate as { initialize?: unknown }).initialize : undefined))
                : undefined;
        if (initializer !== undefined && typeof initializer !== "function") {
            throw new Error("runner-bun: sequence initialize export must be a function when provided");
        }
        if (initializer) {
            await initializer(candidate);
        }
        const fns = Array.isArray(candidate) ? candidate : [candidate];
        const input = Readable.from([]);
        const sequenceArgs = bootConfig.sequenceArgs ?? [];

        try {
            for (const fn of fns) {
                if (typeof fn === "function") {
                    await fn(input, ...sequenceArgs);
                }
            }
        } catch (err) {
            logRuntimeError("instance-runtime", bootConfig, err);
            throw err;
        }

        return 0;
    }

    try {
        return await runRunnerNode(bootConfigPath);
    } catch (err) {
        logRuntimeError("instance-runtime", bootConfig, err);
        throw err;
    }
}

if (require.main === module) {
    bootstrap()
        .then((code) => {
            process.exitCode = code;
        })
        .catch((err) => {
            console.error("runner-bun failed:", err instanceof Error ? (err.stack ?? err.message) : err);
            process.exitCode = 1;
        });
}
