#!/usr/bin/env ts-node

import { Command } from "commander";
// import { version } from "../../package.json";
import { commands } from "../lib/commands/index";

const program: Command = new Command() as Command;

for (const command of Object.values(commands))
    command(program);

program
    // .version(version)
    .description("https://github.com/scramjetorg/scramjet-sequence-template#dictionary")
    .option("-L, --log-level <level>", "Specify log level")
    .option("-a, --api-url <url>", "Specify base API url", "http://localhost:8000/api/v1/")
    .parse(process.argv)
    .opts()
;
