#!/usr/bin/env ts-node
/* eslint-disable no-console */

import { Command } from "commander";
import { SequenceCreator } from "../index";
import { ObjLogger } from "@scramjet/obj-logger";

let sequenceName = "";

const program = new Command();
const options = program
    .arguments("<name>")
    .action((name) => { sequenceName = name; })
    .option("--lang, <js|ts|py>", "Sequence language")
    .option("--log-level, <debug|trace>", "Specify log level", "trace")
    .option("--overwrite", "Overwrite existing sequence", false)
    .parse(process.argv)
    .opts();

// eslint-disable-next-line no-console
if (!ObjLogger.isLogLevelValid(options.logLevel)) {
    throw new Error(`Invalid log level: ${options.logLevel}`);
}

SequenceCreator.create({
    name: sequenceName,
    lang: options.lang,
    overwrite: options.overwrite,
}, (options.logLevel || "trace").toUpperCase());
