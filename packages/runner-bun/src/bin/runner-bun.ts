#!/usr/bin/env bun

import { RunnerExitCode } from "@scramjet/symbols";
import {
    bootstrap as bootstrapRunnerNode,
    legacyExitFilePath,
    writeLegacyExitFileSecure,
} from "@scramjet/runner-node";
import type { RunnerNodeBootConfig, RunnerNodeFdStreams } from "@scramjet/runner-node";
import { parseBootConfigPathFromArgv, readBootConfig } from "../boot-config";
import { createBunFdStreams } from "../fd-streams";
import { assertSupportedBunVersion } from "../runtime-version";

const LEGACY_RUNTIME_ENV_VARS = ["SEQUENCE_PATH", "SEQUENCE_INFO", "RUNNER_CONNECT_INFO"] as const;

function clearLegacyRuntimeEnvironment(): void {
    for (const name of LEGACY_RUNTIME_ENV_VARS) delete process.env[name];
}

function writeExitArtifact(code: number): void {
    writeLegacyExitFileSecure(legacyExitFilePath(process.pid), code, {
        warn: (...args: unknown[]) => console.warn("runner-bun: exit artifact write skipped", ...args),
    });
}

async function flushMonitoring(streams: RunnerNodeFdStreams): Promise<void> {
    const output = streams.monitoringOut;
    if (!output.destroyed && !output.writableFinished) {
        await new Promise<void>(resolve => {
            const finish = () => {
                output.off("finish", finish);
                output.off("error", finish);
                resolve();
            };
            output.once("finish", finish);
            output.once("error", finish);
            if (!output.writableEnded) output.end();
        });
    }
    if (!streams.controlIn.destroyed) streams.controlIn.destroy();
}

export async function bootstrap(): Promise<number> {
    if (typeof process.versions.bun !== "string") {
        console.error("runner-bun failed: this entrypoint must execute under Bun");
        writeExitArtifact(1);
        return 1;
    }
    try {
        assertSupportedBunVersion(process.versions.bun);
    } catch (error) {
        console.error("runner-bun failed:", error instanceof Error ? error.message : error);
        writeExitArtifact(1);
        return 1;
    }

    let bootConfig;
    let streams: RunnerNodeFdStreams | undefined;
    let sharedBootstrapStarted = false;

    try {
        bootConfig = readBootConfig(parseBootConfigPathFromArgv(process.argv));
        if (bootConfig.instancesServerPort === undefined || bootConfig.instancesServerHost === undefined) {
            throw new Error("runner-bun: host channels are required; Bun sequences must run through the supported hosted runner path");
        }

        clearLegacyRuntimeEnvironment();
        streams = createBunFdStreams();
        sharedBootstrapStarted = true;
        return await bootstrapRunnerNode({
            bootConfig: bootConfig as unknown as RunnerNodeBootConfig,
            createFdStreams: () => streams!,
        });
    } catch (error) {
        console.error("runner-bun failed:", error instanceof Error ? (error.stack ?? error.message) : error);
        if (streams) await flushMonitoring(streams);

        const exitCode = sharedBootstrapStarted ? RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION : 1;
        writeExitArtifact(exitCode);
        return exitCode;
    } finally {
        if (streams && !streams.controlIn.destroyed) streams.controlIn.destroy();
    }
}

if (require.main === module) {
    bootstrap()
        .then(code => {
            process.exitCode = code;
            process.exit(code);
        })
        .catch(error => {
            console.error("runner-bun failed:", error instanceof Error ? (error.stack ?? error.message) : error);
            const code = RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION;
            writeExitArtifact(code);
            process.exit(code);
        });
}
