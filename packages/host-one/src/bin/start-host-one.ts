#!/usr/bin/env node

// import { HostOne } from "../host-one";
import * as path from "path";
import * as fs from "fs";

// Example of usage: cat packg.tgz | ssh cz@woking scramjet - host - one "$(cat YourInputFile.txt)" true 1 abc ( todo:remove )
let sequencePath: any;
let configPath: any;
let sequenceArgs: string | Array<any>;
let packageStrem: any;
let appConfig: any;

const errors = {
    incorrectArg: "Incorrect argument:",
    noPath: "Path does not exists:",
    noData: "No data provided.",
    missing: "Missing argument: "
}

switch (true) {
    case process.argv[2] === undefined:
        console.error(errors.missing + 'sequence.');
        process.exit(1);
    case process.argv[3] === undefined:
        console.error(errors.missing + 'config.');
        process.exit(1);
    default:
        console.log('Checking data');
}

sequenceArgs = process.argv[4] ? process.argv.slice(4) : "";

// when string is passed
const checkIfPathExist: any = (arg: string, cb: any) => {
    let pathToFile = path.resolve(process.cwd(), arg)

    if (!fs.existsSync(pathToFile)) {
        console.error(`${errors.incorrectArg} ${arg}. ${errors.noPath} ${pathToFile}`);
        process.exit(1);
    } else {
        return cb(pathToFile)
    }
}

appConfig = checkIfPathExist(process.argv[2], (arg: string) => fs.readFileSync(arg));
packageStrem = checkIfPathExist(process.argv[3], (arg: string) => fs.createReadStream(arg));

console.log('appConfig', appConfig)
console.log('packageStrem', appConfig)

/**
* Start hostOne script.
* * Creates an instance of a hostOne.
* * Creates stream form sequence.
* * Runs the host.
*/
// const hostOne: HostOne = new HostOne();

/**
 * @param { stream } packageStrem - sequence stream
 * @param { object } appConfig - config file
 * @param { Array<any> } sequenceArgs - other optional arguments
 */
// hostOne.init(packageStrem, appConfig, sequenceArgs);
