#!/usr/bin/env node

/**
 * @fileoverview
 *
 * Script can be run via commands:
 * * path/start-host-one.js package.tar.gz config.json arg1 arg2 arg3
 * * path/start-host-one.js "$(cat package.tar.gz)" "$(cat config.json)" "$(cat args.txt)"
 */

import { addLoggerOutput } from "@scramjet/logger";
import * as fs from "fs";
import { HostOne } from "../host-one";
import path = require("path");

const errors = {
    incorrectArg: "Incorrect argument:",
    noPath: "Path does not exists:",
    noData: "No data provided.",
    missing: "Missing argument: ",
    unsuportedExtension: "Extension unsupported"
};
//
const extensions = {
    package: ["tar", "zip", "rar", "tar.gz"], // TODO: only tar is now supported
    config: ["json", "txt", "js"]
};
//
const validatePath: any = (filepath: string, allowedExtensions: string[] = [], cb: Function) => {
    const pathToFile = path.resolve(process.cwd(), filepath);

    if (!fs.existsSync(pathToFile)) {
        console.error(`${errors.incorrectArg} ${filepath}. ${errors.noPath} ${pathToFile}`);
        process.exit(1);
    }

    const extensionSupported = allowedExtensions.find(
        (ext: string) => new RegExp(`${"." + ext}$`).test(filepath)
    );

    if (!extensionSupported) {
        console.error(`${errors.incorrectArg} ${filepath}. ${errors.unsuportedExtension} ${pathToFile}`);
        process.exit(1);
    }

    return cb(pathToFile);
};

if (process.argv[2] === undefined) {
    console.error(errors.missing + "sequence.");
    process.exit(1);
}

if (process.argv[3] === undefined) {
    console.error(errors.missing + "config.");
    process.exit(1);
}

// Creates stream from sequence.
const packageStream: any = validatePath(process.argv[2], extensions.package, (arg: string) => fs.createReadStream(arg));
// TODO: Is this needed to be passed here?
const appConfig: any = validatePath(process.argv[3], extensions.config, (arg: string) => fs.readFileSync(arg, "utf8"));
const sequenceArgs: Array<string> | undefined = process.argv[4] !== undefined ? process.argv.slice(4) : undefined;

addLoggerOutput(process.stderr);

/**
* Creates HostOne instance.
* Runs the Host.
*/
(async () => {
    const hostOne: HostOne = new HostOne();

    hostOne.init(packageStream, appConfig, sequenceArgs);
    await hostOne.main();
})().catch(e => {
    console.error(e.stack);
    process.exitCode = e.exitCode || 1;
    process.exit();
});
