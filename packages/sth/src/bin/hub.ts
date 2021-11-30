#!/usr/bin/env ts-node

import { Command } from "commander";
import { ConfigService } from "@scramjet/sth-config";
import { resolve } from "path";

const program = new Command();
const options = program
    // .version(version) // TODO: replace with find-package-json
    .option("-L, --log-level <level>", "Specify log level", "debug")
    .option("-S, --socket-path <socket>", "CSI socket location")
    .option("-P, --port <port>", "API port")
    .option("-H, --hostname <IP>", "API IP")
    .option("-E, --identify-existing", "Index existing volumes as sequences", false)
    .option("-C, --cpm-url <host:ip>")
    .option("--id <id>")
    .option("--runner-image <image name>", "Image used by runner")
    .option("--runner-max-mem <mb>", "Maximum mem used by runner")
    .option("--prerunner-image <image name>", "Image used by prerunner")
    .option("--prerunner-max-mem <mb>", "Maximum mem used by prerunner")
    .option("--expose-host-ip <ip>", "Host IP address that the Runner container's port is mapped to.")
    .option("--no-docker", "Run all the instances on the host machine instead of in docker containers. UNSAFE FOR RUNNING ARBITRARY CODE.", false)
    .option("--sequences-dir", "Only works with --no-docker option. Where should ProcessSequenceAdapter save new sequences")
    .parse(process.argv)
    .opts();

const configService = new ConfigService();

configService.update({
    cpmUrl: options.cpmUrl,
    docker: {
        prerunner: {
            image: options.prerunnerImage,
            maxMem: options.prerunnerMaxMem
        },
        runner: {
            image: options.runnerImage,
            maxMem: options.runnerMaxMem,
            hostIp: options.exposeHostIp
        }
    },
    host: {
        apiBase: "/api/v1",
        socketPath: options.socketPath ? resolve(process.cwd(), options.socketPath) : undefined,
        port: options.port,
        hostname: options.hostname,
        id: options.id
    },
    noDocker: !options.docker,
    sequencesDir: options.sequencesDir
});

// before here we actually load the host and we have the config imported elsewhere
// so the config is changed before compile time, not in runtime.
require("@scramjet/host").startHost({}, configService.getConfig(), {
    identifyExisting: options.identifyExisting as boolean
})
    .catch((e: Error & { exitCode?: number }) => {
        // eslint-disable-next-line no-console
        console.error(e.stack);
        process.exitCode = e.exitCode || 1;
        process.exit();
    });

