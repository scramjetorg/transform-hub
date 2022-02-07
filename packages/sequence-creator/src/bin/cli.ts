#!/usr/bin/env ts-node

import { Command } from "commander";
import { SequenceCreator } from "../lib/sequence-creator";
import { ObjLogger } from "@scramjet/obj-logger";

let sequenceName = "";

export const createProgram = new Command();

const options = createProgram
    .arguments("<name>")
    .action((name: string) => {
        sequenceName = name;
    })
    .option("--lang, <js|ts>", "Sequence language")
    .option("--log-level, <debug|trace>", "Specify log level", "trace")
    .option("--overwrite", "Overwrite existing sequence", false)
    .parse(process.argv)
    .opts();

if (!ObjLogger.isLogLevelValid(options.logLevel)) {
    throw new Error(`Invalid log level: ${options.logLevel}`);
}

SequenceCreator.create(
    {
        name: sequenceName,
        lang: options.lang,
        overwrite: options.overwrite,
    },
    (options.logLevel || "trace").toUpperCase()
);
