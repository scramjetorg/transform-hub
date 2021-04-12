#!/usr/bin/env node

import { Runner } from "../runner";
import { AppConfig } from "@scramjet/types";
import { stdout, stdin } from "process";
import * as fs from "fs";
import * as path from "path";
import { HandshakeAcknowledgeMessage, RunnerMessageCode } from "@scramjet/model";

const rootDir = path.resolve(__dirname, "../../..");

if (!process.env.SEQUENCE_PATH) {
    console.error("Missing SEQUENCE_PATH!");
    process.exit(1);
}

const sequencePath: string = path.join(rootDir, process.env.SEQUENCE_PATH);

if (!fs.existsSync(sequencePath)) {
    console.error("Incorrect run argument: sequence path (" + sequencePath + ") does not exists. ");
    process.exit(1);
}

/**
 * Start local runner script.
 * 
 * Usage example:
 * SEQUENCE_PATH=/dist/reference-apps/inert-sequence-2/index.js node start-runner-local.js
 */

const runner: Runner<AppConfig> = new Runner(sequencePath, "fakeFifosPath");

runner.hookupControlStream = async () => {
    runner["controlStream"] = stdin;
    runner.defineControlStream();
};

runner.hookupMonitorStream = async () => {
    runner["monitorStream"] = stdout;
};

runner.main();

const pongMsg: HandshakeAcknowledgeMessage = {
    msgCode: RunnerMessageCode.PONG,
    appConfig: {}
};

runner.handleReceptionOfHandshake(pongMsg);
