#!/usr/bin/env ts-node
/* eslint-disable no-console */

import { Command } from "commander";
import { ClientError } from "@scramjet/api-client";
import { commands } from "../lib/commands/index";
import { getConfig } from "../lib/config";

const getExitCode = (_err: ClientError) => 1;
const program: Command = new Command();
const errorHandler = (err: ClientError) => {
    process.exitCode = getExitCode(err);
    const opts = program.opts();

    if (opts.format === "json") {
        console.log(JSON.stringify({
            error: true,
            code: err?.code,
            stack: opts.log ? err?.stack : undefined,
            message: err?.message,
            reason: err?.reason?.message
        }));
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
    const conf = getConfig();

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
    for (const command of Object.values(commands))
        command(program);

    /**
     * Options
     * ```json
     * -L, --log-level <level>       Specify log level (default: "trace")
     * -a, --api-url <url>           Specify base API url (default: "http://127.0.0.1:8000/api/v1")
     * -h, --help                    display help for command
     * ```
     */
    program
        // .version(version)
        .description("https://github.com/scramjetorg/scramjet-sequence-template#dictionary")
        .option("-L, --log", "Logs all API requests in detail", conf.log)
        .option("-a, --api-url <url>", "Specify base API url", conf.apiUrl)
        .option("-f, --format <value>", "Specify display formatting: json or pretty", conf.format)
        .parse(process.argv)
        .opts()
    ;

    await new Promise(res => program.hook("postAction", res));
})()
    .catch(errorHandler);

process.on("uncaughtException", errorHandler);
process.on("unhandledRejection", errorHandler);
