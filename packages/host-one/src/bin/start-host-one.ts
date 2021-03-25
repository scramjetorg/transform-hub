#!/usr/bin/env node

import { HostOne } from "../host-one";
import * as path from "path";
import * as fs from "fs";

let sequencePath: string = path.resolve(process.cwd(), process.argv[2]) || "";
let configPath: string = path.resolve(process.cwd(), process.argv[3]) || "";
let cmdArgs = process.argv[4] ? process.argv.slice(4) : "";
let packageStrem;
let appConfig;
let sequenceArgs;

if (!fs.existsSync(configPath)) {
    console.error("Incorrect run argument: config path (" + configPath + ") does not exists. ");
    process.exit(1);
} else {
    appConfig = fs.readFileSync(configPath);
    console.log(appConfig);
}

if (!fs.existsSync(sequencePath)) {
    console.error("Incorrect run argument: sequence path (" + sequencePath + ") does not exists. ");
    process.exit(1);
} else {
    console.log(sequencePath);
    packageStrem = fs.createReadStream(sequencePath);
}

console.log(cmdArgs);

/**
* Start hostOne script.
* * Creates an instance of a hostOne.
* * Creates stream form sequence.
* * Runs the host.
*/
const hostOne: HostOne = new HostOne();

/**
 * 
 * @param { stream } packageStrem - sequence stream
 * @param { object } appConfig - config file
 * @param { Array<any> } sequenceArgs - other optional arguments
 */
hostOne.init(packageStrem, appConfig, sequenceArgs);
