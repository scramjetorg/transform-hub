#!/usr/bin/env bun
/* eslint-disable no-console */

import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { Readable } from "stream";
import { RunnerExitCode } from "@scramjet/symbols";
import { parseBootConfigPathFromArgv, readBootConfig } from "../boot-config";

interface RunnerNodeEntry {
    entry: string;
    needsTsNode: boolean;
}

function resolveRunnerNodeEntry(): RunnerNodeEntry {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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

    const compiled = resolve(pkgRoot, "dist/bin/runner-node.js");

    if (existsSync(compiled)) {
        return { entry: compiled, needsTsNode: false };
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
        env.NODE_OPTIONS = [env.NODE_OPTIONS, "--require ts-node/register/transpile-only"]
            .filter(Boolean)
            .join(" ");
    }

    const child = spawn(process.env.NODE_BIN || "node", [resolved.entry, bootConfigPath], {
        env,
        stdio: ["inherit", "inherit", "inherit", "ipc", "inherit", "inherit"]
    });

    child.channel?.unref?.();

    return new Promise((resolveCode, reject) => {
        child.once("error", reject);
        child.once("exit", (code, signal) => {
            if (typeof code === "number") {
                resolveCode(code);
                return;
            }

            reject(new Error(`runner-bun: delegated runner-node exited by signal ${signal ?? "unknown"}`));
        });
    });
}

export async function bootstrap(): Promise<number> {
    const bootConfigPath = parseBootConfigPathFromArgv(process.argv);

    // Validate with Bun-specific error messages before delegating to the
    // protocol-compatible Node runtime implementation. This keeps runner-bun's
    // boot contract explicit while allowing Bun to execute the TS runtime entry.
    const bootConfig = readBootConfig(bootConfigPath);

    if (bootConfig.instancesServerPort === undefined && bootConfig.instancesServerHost === undefined) {
        const loaded = require(bootConfig.sequencePath);
        const candidate = loaded?.default ?? loaded;
        const fns = Array.isArray(candidate) ? candidate : [candidate];
        const input = Readable.from([]);

        for (const fn of fns) {
            if (typeof fn === "function") {
                await fn(input, ...(bootConfig.sequenceArgs ?? []));
            }
        }

        return RunnerExitCode.SUCCESS;
    }

    return runRunnerNode(bootConfigPath);
}

if (require.main === module) {
    bootstrap()
        .then(code => {
            process.exitCode = code;
        })
        .catch(err => {
            console.error("runner-bun failed:", err instanceof Error ? err.stack ?? err.message : err);
            process.exitCode = 1;
        });
}
