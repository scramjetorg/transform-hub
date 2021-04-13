#!/usr/bin/env node
/* eslint-disable dot-notation */

import { Runner } from "../runner";
import { stdout, stdin } from "process";
import * as fs from "fs";
import * as path from "path";
import { HandshakeAcknowledgeMessage, RunnerMessageCode } from "@scramjet/model";
import { AppConfig } from "@scramjet/types";

if (!process.env.SEQUENCE_PATH) {
    console.error("Missing SEQUENCE_PATH!");
    process.exit(1);
}

const sequencePath: string = path.resolve(process.cwd(), process.env.SEQUENCE_PATH);

if (!fs.existsSync(sequencePath)) {
    console.error("Incorrect run argument: sequence path (" + sequencePath + ") does not exists. ");
    process.exit(1);
}

/**
 * Start local runner script.
 *
 * Usage example:
 *
 * SEQUENCE_PATH=dist/reference-apps/inert-sequence-2/index.js \
    node dist/runner/bin/start-runner-local.js
 *
 * SEQUENCE_PATH=dist/samples/example APP_ARGUMENTS="dist/samples/example/data.json output.txt" \
 *     node dist/runner/bin/start-runner-local.js
 */

const sequenceAppConfig: AppConfig = process.env.APP_CONFIG ? JSON.parse(process.env.APP_CONFIG) : {};
const sequenceArgs: string[] | undefined = process.env.APP_ARGUMENTS?.split(" ");
const runner: Runner<AppConfig> = new Runner(sequencePath, "fakeFifosPath");

runner.hookupControlStream = async () => {
    runner["controlStream"] = stdin;
    runner.defineControlStream();
};

runner.hookupMonitorStream = async () => {
    runner["monitorStream"] = stdout;
};

runner.hookupLoggerStream = async () => {
    runner["loggerStream"] = stdout;
};

(async () => {
    const ref = runner.main();
    const pongMsg: HandshakeAcknowledgeMessage = {
        msgCode: RunnerMessageCode.PONG,
        appConfig: sequenceAppConfig,
        arguments: sequenceArgs
    };

    runner.handleReceptionOfHandshake(pongMsg);

    await ref;
})()
    .catch(e => {
        console.error(e.stack);
        process.exitCode = 11;
    });

