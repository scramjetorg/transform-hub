#!/usr/bin/env node
/* eslint-disable dot-notation */

import { RunnerMessageCode } from "@scramjet/symbols";
import { AppConfig, HandshakeAcknowledgeMessage, ReadableStream } from "@scramjet/types";

import { Runner } from "../runner";
import { stdout } from "process";
import * as fs from "fs";
import * as path from "path";
import { PassThrough, Readable } from "stream";
import { StringStream } from "scramjet";
import { createReadStream, createWriteStream } from "fs";

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
 * SEQUENCE_PATH=dist/reference-apps/hello-alice-out \
 *     APP_ARGUMENTS="dist/reference-apps/hello-alice-out/data.json output.txt" \
 *     node dist/runner/bin/start-runner-local.js
 *
 * INPUT_PATH=.work/input.txt OUTPUT_PATH=.work/output.txt
 */

const sequenceAppConfig: AppConfig = process.env.APP_CONFIG ? JSON.parse(process.env.APP_CONFIG) : {};
const sequenceArgs: string[] | undefined = process.env.APP_ARGUMENTS?.split(" ");
const runner: Runner<AppConfig> = new Runner(sequencePath, "fakeFifosPath");

runner.hookupControlStream = async () => {
    runner["controlStream"] = new PassThrough();
    runner.defineControlStream();
};

runner.hookupMonitorStream = async () => {
    runner["monitorStream"] = new PassThrough();
};

runner.hookupLoggerStream = async () => {
    runner["loggerStream"] = stdout;
};

runner.hookupInputStream = async () => {
    if (process.env.INPUT_PATH) {
        runner["inputStream"] = createReadStream(process.env.INPUT_PATH);
        runner["inputDataStream"] = StringStream
            .from(runner["inputStream"] as Readable)
            .JSONParse() // TODO: what if the app consumes buffer/string data
        ;
    } else {
        const stream = StringStream.from([]);

        runner["inputStream"] = stream as unknown as ReadableStream<string>;
        // TODO: what if the app consumes buffer/string data
        runner["inputDataStream"] = stream.JSONParse();
    }
};

runner.hookupOutputStream = async () => {
    if (process.env.OUTPUT_PATH) {
        runner["outputStream"] = createWriteStream(process.env.OUTPUT_PATH);
    } else {
        runner["outputStream"] = process.stdout;
    }
    // TODO: what if the app outputs buffer/string data
    runner["outputDataStream"]
        .JSONStringify()
        .prepend("[output]: ")
        .pipe(runner["outputStream"]);
};

runner.cleanupStreams = async () => {
    runner.logger.log("cleanup");
};

(async () => {
    const ref = runner.main();
    const pongMsg: HandshakeAcknowledgeMessage = {
        msgCode: RunnerMessageCode.PONG,
        appConfig: sequenceAppConfig,
        args: sequenceArgs
    };

    runner.handshakeResolver?.res(pongMsg);

    await ref;
})()
    .catch(e => {
        console.error(e.stack);
        process.exitCode = e.errorCode || 11;
        process.exit();
    });

