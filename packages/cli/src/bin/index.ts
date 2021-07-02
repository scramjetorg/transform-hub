#!/usr/bin/env ts-node

import { Command, OptionValues } from "commander";
import { ClientError } from "@scramjet/api-client";
// import { version } from "../../package.json";
import { commands } from "../lib/commands/index";
import { getConfig } from "../lib/config";

let options: OptionValues;

const program: Command = new Command() as Command;
const errorHandler = (err: ClientError) => {
    process.exitCode = !isNaN(+err.exitCode) ? err.exitCode : 1;
    if (options?.format === "json") {
        console.log(JSON.stringify({
            error: true,
            message: err.message,
            reason: err.reason?.message
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

    options = program
        // .version(version)
        .description("https://github.com/scramjetorg/scramjet-sequence-template#dictionary")
        .option("-L, --log-level <level>", "Specify log level", conf.logLevel)
        .option("-a, --api-url <url>", "Specify base API url", conf.apiUrl)
        .option("-f, --format <value>", "Specify display formatting: json or pretty", conf.format)
        .parse(process.argv)
        .opts()
    ;
})()
    .catch(errorHandler);

process.on("uncaughtException", errorHandler);
process.on("unhandledRejection", errorHandler);
