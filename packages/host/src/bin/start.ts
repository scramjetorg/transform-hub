#!/usr/bin/env ts-node
/* eslint-disable no-console */

import { configService } from "@scramjet/sth-config";
import { HostOptions } from "../lib/host";
import { startHost } from "../lib/start-host";

const opts = require("minimist")(process.argv.slice(2));

if (opts.h || opts.help || opts["?"]) {
    console.log(`Usage: ${process.argv[1]} [--identify-existing]`);

    process.exitCode = 1;
    process.exit();
}

export const options: HostOptions = {
    identifyExisting: !!opts["identify-existing"] // maybe env here also?
};

startHost({}, configService.getConfig().host.socketPath, options)
    .catch(e => {
        console.error(e.stack);
        process.exitCode = e.exitCode || 1;
        process.exit();
    });
