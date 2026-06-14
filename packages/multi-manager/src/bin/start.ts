#!/usr/bin/env ts-node
/* eslint-disable no-console */
import { ConfigOptionDescriptor, parseCliOptions } from "@scramjet/config";
import { MultiManager as MultiManager } from "../lib/multi-manager";
import { createServer, ServerConfiguration } from "@scramjet/api-server";
import { MultiManagerCommandOptions } from "../types/multi-manager-types";
import { MultiManagerConfig, multiManagerCliOptions } from "../config/multi-manager-configuration";
import * as v8 from "v8";

const cliOptions: ConfigOptionDescriptor[] = [
    { name: "config", flag: "config", short: "c", type: "string", description: "Specify path to json configuration file" },
    { name: "colors", flag: "colors", type: "boolean", description: "Disable colors in output", defaultValue: true, negatable: true },
    { name: "id", flag: "id", type: "string", description: "Specify MultiManager id" },
    { name: "serverApiBase", flag: "server-api-base", short: "b", type: "string", description: "Specify MultiManager API server base path" },
    { name: "serverApiPort", flag: "server-api-port", short: "P", type: "number", description: "Specify MultiManager API server port" },
    { name: "serverApiHost", flag: "host", short: "H", type: "string", description: "Host IP to listen on" },
    { name: "serverVersion", flag: "server-version", type: "string", description: "Specify MultiManager API server version" },
    { name: "logLevel", flag: "log-level", type: "string", description: "Specify log level" },
    { name: "dumpHeap", flag: "dump-heap", type: "number", description: "Dump heap to file >once< allocation exceeds given size", defaultValue: 0 },
    { name: "sslKeyPath", flag: "ssl-key-path", type: "string", description: "SSL Key path to encrypt Manager <-> Host communication" },
    { name: "sslCertPath", flag: "ssl-cert-path", type: "string", description: "SSL Certficate path to encrypt Manager <-> Host communication" },
    { name: "manager", flag: "manager", type: "string", description: "Immediately start manager with given id" },
    { name: "healtzPort", flag: "healtz-port", type: "number", description: "Starts monitoring sever on a selected port" },
    { name: "healtzHost", flag: "healtz-host", type: "string", description: "Starts monitoring sever on a specified interface e.g [\"0.0.0.0\"]. Requires --healtz-port" },
    { name: "healtzPath", flag: "healtz-path", type: "string", description: "Exposes monitoring endpoint on specified path. Requires --healtz-port" },
    ...multiManagerCliOptions
        .filter(option => !["colors", "id", "serverApiBase", "serverApiPort", "serverApiHost", "serverVersion", "logLevel", "manager", "healtzPort", "healtzHost", "healtzPath"].includes(option.name))
];

function startMultiManager(options: MultiManagerCommandOptions) {
    try {
        options.manager = JSON.parse(options.manager as any);
    } catch (_e) { /* just id */ }

    const mmServerConfig = new ServerConfiguration({
        sslCertPath: options?.sslCertPath,
        sslKeyPath: options?.sslKeyPath
    });

    if (!mmServerConfig.isValid()) throw new Error("Invalid server configuration");

    const mmConfig = new MultiManagerConfig(options);

    const MultiManagerApiServer = createServer(mmServerConfig.get());
    const multiManager = new MultiManager(MultiManagerApiServer, mmConfig);

    console.error(`Dump heap: ${options.dumpHeap}`);
    if (options.dumpHeap && options.dumpHeap > 0) {
        let int = setInterval(() => {
            const heap = process.memoryUsage().heapUsed / 1024 / 1024;

            console.error(`Heap usage: ${heap.toFixed(2)} MB`);
            if (heap > options.dumpHeap) {
                v8.writeHeapSnapshot(`/tmp/heapdump-${mmConfig.id || "default"}.heapsnapshot`);
                clearInterval(int);
            }
        }, 10_000);
    }

    multiManager.start()
        .catch((e) => {
            console.error(e.stack);
            process.exitCode = e.exitCode || 1;
            process.exit();
        });
}

startMultiManager(parseCliOptions({ argv: process.argv, options: cliOptions }) as Partial<MultiManagerCommandOptions> as MultiManagerCommandOptions);
