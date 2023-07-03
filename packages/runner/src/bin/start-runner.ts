#!/usr/bin/env node

import { Runner } from "../runner";
import fs from "fs";
import { AppConfig } from "@scramjet/types";
import { HostClient } from "../host-client";
import { RunnerExitCode } from "@scramjet/symbols";

const sequencePath: string = process.env.SEQUENCE_PATH?.replace(/.js$/, "") + ".js";
const instancesServerPort = process.env.INSTANCES_SERVER_PORT;
const instancesServerHost = process.env.INSTANCES_SERVER_HOST;
const instanceId = process.env.INSTANCE_ID;
const instanceConnectJSON = process.env.INSTANCE_CONNECT_JSON;

let connectInfo;

try {
    connectInfo = JSON.parse(instanceConnectJSON);
} catch {
    console.error("Error while parsing connection information.");
    process.exit(RunnerExitCode.INVALID_ENV_VARS);
}

if (!instancesServerPort || instancesServerPort !== parseInt(instancesServerPort, 10).toString()) {
    console.error("Incorrect run argument: instancesServerPort");
    process.exit(RunnerExitCode.INVALID_ENV_VARS);
}

if (!instancesServerHost) {
    console.error("Incorrect run argument: instancesServerHost");
    process.exit(RunnerExitCode.INVALID_ENV_VARS);
}

if (!instanceId) {
    console.error("Incorrect run argument: instanceId");
    process.exit(RunnerExitCode.INVALID_ENV_VARS);
}

if (!fs.existsSync(sequencePath)) {
    console.error("Incorrect run argument: sequence path (" + sequencePath + ") does not exists. ");
    process.exit(RunnerExitCode.INVALID_SEQUENCE_PATH);
}

const hostClient = new HostClient(+instancesServerPort, instancesServerHost);

/**
 * Start runner script.
 *
 * * Creates an instance of a runner.
 * * Runs a sequence.
 *
 * @param sequencePath - sequence file path
 * @param fifosPath - fifo files path
 */

const runner: Runner<AppConfig> = new Runner(sequencePath, hostClient, instanceId, connectInfo);

runner.main()
    .catch(e => {
        process.exitCode = e.errorCode || 11;
        process.exit();
    });
