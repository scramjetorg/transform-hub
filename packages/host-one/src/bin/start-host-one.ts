#!/usr/bin/env node

import { HostOne } from "../host-one";
import * as path from "path";
import * as fs from "fs";

let sequencePath: string = path.resolve(process.cwd(), process.argv[2]) || "";
let configPath: string = path.resolve(process.cwd(), process.argv[3]) || "";

if (!fs.existsSync(configPath)) {
    console.error("Incorrect run argument: config path (" + configPath + ") does not exists. ");
    process.exit(1);
}

if (!fs.existsSync(sequencePath)) {
    console.error("Incorrect run argument: sequence path (" + sequencePath + ") does not exists. ");
    process.exit(1);
}

/**
* Start hostOne script.
*
* * Creates an instance of a hostOne.
* * Runs the host.
*
* @param sequencePath - sequence file path
* @param configPath - config file path
*/

//TODO an array of strings - sequenceArguments can be passed as a third argument 
//like here:["../../package/data.json", "out.txt"];
//to discuss what would be the best solution? 
//to avoid ./start-host-one sequencePath configPath seqArg1 seqArg2 ...
const hostOne: HostOne = new HostOne();

hostOne.main();
