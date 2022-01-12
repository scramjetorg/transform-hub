#!/usr/bin/env node

import { Runner } from "../runner";
import * as fs from "fs";
import { AppConfig } from "@scramjet/types";
import { HostClient } from "../host-client";

const sequencePath: string = process.env.SEQUENCE_PATH?.replace(/.js$/, "") + ".js";
const instancesServerPort = process.env.INSTANCES_SERVER_PORT;
const instancesServerIp = process.env.INSTANCES_SERVER_IP;
const instanceId = process.env.INSTANCE_ID;

if (!instancesServerPort || instancesServerPort !== parseInt(instancesServerPort, 10).toString()) {
    console.error("Incorrect run argument: instancesServerPort");
    process.exit(1);
}

const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

if (!instancesServerIp || !instancesServerIp.match(ipRegex)) {
    console.error("Incorrect run argument: instancesServerIp");
    process.exit(1);
}

if (!instanceId) {
    console.error("Incorrect run argument: instanceId");
    process.exit(1);
}

if (!fs.existsSync(sequencePath)) {
    console.error("Incorrect run argument: sequence path (" + sequencePath + ") does not exists. ");
    process.exit(1);
}

const hostClient = new HostClient(+instancesServerPort, instancesServerIp);

/**
 * Start runner script.
 *
 * * Creates an instance of a runner.
 * * Runs a sequence.
 *
 * @param sequencePath - sequence file path
 * @param fifosPath - fifo files path
 */

const runner: Runner<AppConfig> = new Runner(sequencePath, hostClient, instanceId);

runner.main()
    .catch(e => {
        process.exitCode = e.errorCode || 11;
        process.exit();
    });
