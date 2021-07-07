#!/usr/bin/env ts-node

import { Command } from "commander";
import { ClientError } from "@scramjet/api-client";
// import { version } from "../../package.json";
import { commands } from "../lib/commands/index";
import { getConfig } from "../lib/config";

const getExitCode = (_err: ClientError) => 1;
const program: Command = new Command() as Command;
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

(async () => {
    const conf = getConfig();

    for (const command of Object.values(commands))
        command(program);

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
