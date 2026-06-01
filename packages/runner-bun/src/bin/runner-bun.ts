#!/usr/bin/env bun
/* eslint-disable no-console */

import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { RunnerExitCode } from "@scramjet/symbols";
import { parseBootConfigPathFromArgv, readBootConfig } from "../boot-config";

function loadRunnerNodeBootstrap(): () => Promise<number> {
    // Prefer compiled CommonJS. Bun's TS/ESM loader is stricter about
    // type-only re-exports in the source workspace than tsc/Node, while the
    // published/Docker layout exposes compiled JS.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkgJson = require.resolve("@scramjet/runner-node/package.json");
    const pkgRoot = dirname(pkgJson);
    const compiled = resolve(pkgRoot, "dist/index.js");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(existsSync(compiled) ? compiled : "@scramjet/runner-node") as typeof import("@scramjet/runner-node");

    return mod.bootstrap;
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

        for (const fn of fns) {
            if (typeof fn === "function") {
                await fn(...(bootConfig.sequenceArgs ?? []));
            }
        }

        return RunnerExitCode.SUCCESS;
    }

    return loadRunnerNodeBootstrap()();
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
