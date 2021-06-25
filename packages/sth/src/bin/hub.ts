#!/usr/bin/env ts-node

import { Command } from "commander";
import { configService } from "@scramjet/sth-config";
// import { version } from "../../package.json";

const program: Command = new Command() as Command;
const options = program
    // .version(version) // TODO: replace with find-package-json
    .option("-L, --log-level <level>", "Specify log level", "debug")
    .option("-S, --socket-location <socket>", "CSI socket location")
    .option("-P, --port <port>", "API port")
    .option("-H, --hostname <IP>", "API IP")
    .option("-E, --identify-existing", "Index existing volumes as sequences", false)
    .parse(process.argv)
    .opts()
;

configService.update({
    host: {
        apiBase: "/api/v1",
        socketPath: options.socketLocation,
        port: options.port,
        hostname: options.hostname
    }
});

// before here we actually load the host and we have the config imported elsewhere
// so the config is changed before compile time, not in runtime.
require("@scramjet/host").startHost({}, options.socketLocation as string, {
    identifyExisting: options.identifyExisting as boolean
})
    .catch((e: Error & { exitCode?: number }) => {
        console.error(e.stack);
        process.exitCode = e.exitCode || 1;
        process.exit();
    });

