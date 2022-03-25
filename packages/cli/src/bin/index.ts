#!/usr/bin/env ts-node
/* eslint-disable no-console */

import commander from "commander";
import completionMixin, { Command } from "commander-completion";
import { ClientError, ClientUtils } from "@scramjet/client-utils";

import { commands } from "../lib/commands/index";
import { setPlatformDefaults } from "../lib/platform";
import { globalConfig } from "../lib/config";
import { initPaths } from "../lib/paths";

const CommandClass = completionMixin(commander).Command;

const getExitCode = (_err: ClientError) => 1;
const program = new CommandClass() as Command;
const errorHandler = (err: ClientError) => {
    process.exitCode = getExitCode(err);
    const opts = program.opts();

    if (opts.format === "json") {
        console.log(
            JSON.stringify({
                error: true,
                code: err?.code,
                stack: opts.log ? err?.stack : undefined,
                message: err?.message,
                reason: err?.reason?.message,
            })
        );
    } else {
        console.error(err.stack);
        if (err.reason) {
            console.error("Caused by:");
            console.error(err.reason.stack);
        }
    }
    process.exit();
};

/**
 * Start commander using defined config {@link Apple.seeds}
 */
(async () => {
    initPaths();
    const { token, env, middlewareApiUrl } = globalConfig.getConfig();

    if (token && globalConfig.isProductionEnv(env) && middlewareApiUrl) {
        ClientUtils.setDefaultHeaders({
            Authorization: `Bearer ${token}`,
        });

        await setPlatformDefaults(program);
    }

    /**
     * Commands
     * ```
     * pack [options] [<directory>]
     * host [command]                operations on host
     * config|c [command]            configuration file operations
     * sequence|seq [command]        operations on sequence
     * instance|inst [command]       operations on instance
     * help [command]                display help for command
     */
    for (const command of Object.values(commands)) command(program);

    /**
     * Options
     * ```json
     * -h, --help                    display help for command
     * ```
     */
    program
        .description("https://github.com/scramjetorg/scramjet-sequence-template#dictionary")
        .parse(process.argv)
        .opts();

    await new Promise((res) => program.hook("postAction", res));
})().catch(errorHandler);

process.on("uncaughtException", errorHandler);
process.on("unhandledRejection", errorHandler);
