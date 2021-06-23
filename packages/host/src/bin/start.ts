#!/usr/bin/env node

import { createServer } from "@scramjet/api-server";
import { configService } from "@scramjet/csi-config";
import { Host, HostOptions } from "../lib/host";
import { SocketServer } from "../lib/socket-server";

const opts = require("minimist")(process.argv.slice(2));

if (opts.h || opts.help || opts["?"]) {
    console.log(`Usage: ${process.argv[1]} [--identify-existing]`);
    process.exitCode = 1;
    process.exit();
}

const options: HostOptions = {
    identifyExisiting: !!opts["identify-existing"] // maybe env here also?
};
const apiServerConfig = {};
const apiServer = createServer(apiServerConfig);
const tcpServer = new SocketServer(configService.getConfig().host.socketPath);
//
const host = new Host(apiServer, tcpServer);

(async () => {
    await host.main(options);
})().catch(e => {
    console.error(e.stack);
    process.exitCode = e.exitCode || 1;
    process.exit();
});
