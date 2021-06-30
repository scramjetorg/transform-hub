#!/usr/bin/env ts-node

import { Command } from "commander";
// import { version } from "../../package.json";
import { commands } from "../lib/commands/index";
import { getConfig } from "../lib/config";

const program: Command = new Command() as Command;

(async () => {
    const conf = getConfig();

    for (const command of Object.values(commands))
        command(program);

    program
        // .version(version)
        .description("https://github.com/scramjetorg/scramjet-sequence-template#dictionary")
        .option("-L, --log-level <level>", "Specify log level", conf.logLevel)
        .option("-a, --api-url <url>", "Specify base API url", conf.apiUrl)
        .option("-f, --format <value>", "Specify display formatting: json or pretty", conf.format)
        .parse(process.argv)
        .opts()
    ;
})().catch(e => {
    console.error(e.stack);
    process.exitCode = e.code || 1;
});
