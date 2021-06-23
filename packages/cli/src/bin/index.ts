#!/usr/bin/env node

import { Command } from "commander";
import { version } from "../../package.json";
import { commands } from "../lib/commands/index";

const program: Command = new Command() as Command;

for (const command of Object.values(commands))
    command(program);

program
    .version(version)
    .description("https://github.com/scramjetorg/scramjet-sequence-template#dictionary")
    .option("-L, --log-level <level>", "Specify log level")
    .parse(process.argv)
    .opts()
;
