#!/usr/bin/env ts-node
/* eslint-disable no-console */
import { Command } from "commander";
import { MultiManager as MultiManager } from "../lib/multi-manager";
import { createServer, ServerConfiguration } from "@scramjet/api-server";
import { MultiManagerCommandOptions } from "../types/multi-manager-types";
import { MultiManagerConfig } from "../config/multi-manager-configuration";
import * as v8 from "v8";

const program = new Command();

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

program
    .description("https://github.com/scramjetorg/scramjet-cloud-docs/blob/main/dictionary.md")
    .option("-c, --config <path>", "Specify path to json configuration file")
    .option("--no-colors", "Disable colors in output")
    .option("--id <id>", "Specify MultiManager id")
    .option("-b, --server-api-base <base>", "Specify MultiManager API server base path")
    .option("-P, --server-api-port <port>", "Specify MultiManager API server port", parseInt)
    .option("-H, --host <host-ip>", "Host IP to listen on")
    .option("--server-version <version>", "Specify MultiManager API server version")
    .option("--log-level <level>", "Specify log level")
    .option("--dump-heap <megabytes>", "Dump heap to file >once< allocation exceeds given size", parseInt, 0)
    .option("--ssl-key-path <path>", "SSL Key path to encrypt Manager <-> Host communication")
    .option("--ssl-cert-path <path>", "SSL Certficate path to encrypt Manager <-> Host communication")
    .option("--manager <id|config>", "Immediately start manager with given id")
    .option("--healtz-port <healtz-port>", "Starts monitoring sever on a selected port", parseInt)
    .option("--healtz-host <healtz-host>", "Starts monitoring sever on a specified interface e.g [\"0.0.0.0\"]. Requires --healtz-port")
    .option("--healtz-path <healtz-path>", "Exposes monitoring endpoint on specified path. Requires --healtz-port")
    .action(startMultiManager)
    .parse(process.argv);
