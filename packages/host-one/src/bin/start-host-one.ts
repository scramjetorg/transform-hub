#!/usr/bin/env node

import * as fs from "fs";
import { HostOne } from "../host-one";
import path = require("path");
/**
 * Script can be run via commands:
 * * path/start-host-one.js package.tar.gz config.json arg1 arg2 arg3
 * * path/start-host-one.js "$(cat package.tar.gz)" "$(cat config.json)" "$(cat args.txt)"
 */
let packageStrem: any;
let appConfig: any;
let sequenceArgs: Array<string> | undefined;

const errors = {
    incorrectArg: "Incorrect argument:",
    noPath: "Path does not exists:",
    noData: "No data provided.",
    missing: "Missing argument: "
};
const extensions = {
    package: ["tar", "zip", "rar"],
    config: ["json", "txt", "js"]
};
const checkIfPathExist: any = (i: number, cb: any) => {
    let arg = process.argv[i];
    let checkExtension = i === 2 ? extensions.package : extensions.config;

    /* eslint-disable no-unused-expressions */
    if (!checkExtension.some(ext => arg.includes(ext))) i === 2 ? cb(arg) : arg;

    let pathToFile = path.resolve(process.cwd(), arg);

    if (!fs.existsSync(pathToFile)) {
        console.error(`${errors.incorrectArg} ${arg}. ${errors.noPath} ${pathToFile}`);
        process.exit(1);
    }
    return cb(pathToFile);
};

/* eslint-disable no-fallthrough */
switch (true) {
case process.argv[2] === undefined:
    console.error(errors.missing + "sequence.");
    process.exit(1);
case process.argv[3] === undefined:
    console.error(errors.missing + "config.");
    process.exit(1);
default:
    console.log("Checking data");
}

packageStrem = checkIfPathExist(2, (arg: string) => fs.createReadStream(arg));
appConfig = checkIfPathExist(3, (arg: string) => fs.readFileSync(arg, "utf8"));
sequenceArgs = process.argv[4] !== undefined ? process.argv.slice(4) : undefined;

/**
* Start hostOne script.
* * Creates an instance of a hostOne.
* * Creates stream form sequence.
* * Runs the host.
*/
const hostOne: HostOne = new HostOne();

(async () => {
    /**
     * @param { stream } packageStrem - sequence stream
     * @param { object } appConfig - config file
     * @param { Array<any> } sequenceArgs - other optional arguments
     */
    await hostOne.init(packageStrem, appConfig, sequenceArgs);
    await hostOne.main();
})().catch(e => {
    console.error(e.stack);
    process.exitCode = e.exitCode || 1;
    process.exit();
});
