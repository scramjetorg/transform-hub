#!/usr/bin/env node

import { Runner } from "../runner";
import * as fs from "fs";
import { AppConfig } from "@scramjet/types";

const sequencePath: string = process.env.SEQUENCE_PATH?.replace(/.js$/, "") + ".js";
const fifosPath: string = process.env.FIFOS_DIR || "";

if (!fs.existsSync(fifosPath)) {
    console.error("Incorrect run argument: fifo path (" + fifosPath + ") does not exists. ");
    process.exit(1);
}

if (!fs.existsSync(sequencePath)) {
    console.error("Incorrect run argument: sequence path (" + sequencePath + ") does not exists. ");
    process.exit(1);
}

/**
 * Start runner script.
 *
 * * Creates an instance of a runner.
 * * Runs a sequence.
 *
 * @param sequencePath - sequence file path
 * @param fifosPath - fifo files path
 */

const runner: Runner<AppConfig> = new Runner(sequencePath, fifosPath);

runner.main()
    .catch(e => {
        process.exitCode = e.errorCode || 11;
        process.exit();
    });
