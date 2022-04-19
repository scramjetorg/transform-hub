#!/usr/bin/env ts-node

import { Command } from "commander";
import { ConfigService, getRuntimeAdapterOption } from "@scramjet/sth-config";
import { STHCommandOptions } from "@scramjet/types";
import { resolve } from "path";
import { HostError } from "@scramjet/model";
import { inspect } from "util";

const program = new Command();
const options: STHCommandOptions = program
    .option("-L, --log-level <level>", "Specify log level", "trace")
    .option("-P, --port <port>", "API port")
    .option("-H, --hostname <IP>", "API IP")
    .option("-E, --identify-existing", "Index existing volumes as sequences", false)
    .option("-C, --cpm-url <host:ip>")
    .option("--cpm-ssl-ca-path <path>", "Certificate Authority for self-signed CPM SSL certificates")
    .option("-I, --id <id>")
    .option("--cpm-id <id>")
    .option("--runtime-adapter <adapter>", "Determines adapters used for loading and starting sequence. One of 'docker', 'process', 'kubernetes'")
    .option("--runner-image <image name>", "Image used by runner")
    .option("--runner-max-mem <mb>", "Maximum mem used by runner")
    .option("--prerunner-image <image name>", "Image used by prerunner")
    .option("--prerunner-max-mem <mb>", "Maximum mem used by prerunner")
    .option("--expose-host-ip <ip>", "Host IP address that the Runner container's port is mapped to.")
    .option("--isp, --instances-server-port <port>", "Port on which server that instances connect to should run.")
    .option("--sequences-root <path>", "Only works with --runtime-adapter='process' option. Where should ProcessSequenceAdapter save new sequences")
    .option("--k8s-namespace <namespace>", "Kubernetes namespace used in Sequence and Instance adapters.")
    .option("--k8s-auth-config-path <path>", "Kubernetes authorization config path. If not supplied the mounted service account will be used.")
    .option("--k8s-sth-pod-host <host>", "Runner needs to connect to STH. This is the host (IP or hostname) that it will try to connect to.")
    .option("--k8s-runner-image <image>", "Runner image spawned in Nodejs Pod.")
    .option("--k8s-runner-py-image <image>", "Runner image spawned in Python Pod.")
    .option("--k8s-sequences-root <path>", "Kubernetes Process Adapter will store sequences here.")
    .option("--k8s-runner-cleanup-timeout <timeout>", "Set timeout for deleting runner Pod after failure in ms")
    .option("--no-docker", "Run all the instances on the host machine instead of in docker containers. UNSAFE FOR RUNNING ARBITRARY CODE.", false)
    .option("--instances-server-port <port>", "Port on which server that instances connect to should run.")
    .option("-D, --sequences-root <path>", "Only works with process adapter. Where should ProcessSequenceAdapter save new sequences.")
    .option("-S, --startup-config <path>", "Only works with process adapter. The configuration of startup sequences.")
    .parse(process.argv)
    .opts();

const configService = new ConfigService();

configService.update({
    cpmUrl: options.cpmUrl,
    cpmId: options.cpmId,
    cpmSslCaPath: options.cpmSslCaPath,
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
        instancesServerPort: options.instancesServerPort ? parseInt(options.instancesServerPort, 10) : undefined,
        port: options.port,
        hostname: options.hostname,
        id: options.id
    },
    runtimeAdapter: getRuntimeAdapterOption(options),
    sequencesRoot: options.sequencesRoot && resolve(process.cwd(), options.sequencesRoot),
    startupConfig: options.startupConfig && resolve(process.cwd(), options.startupConfig),
    logLevel: options.logLevel,
    kubernetes: {
        namespace: options.k8sNamespace,
        authConfigPath: options.k8sAuthConfigPath,
        sthPodHost: options.k8sSthPodHost,
        runnerImages: {
            node: options.k8sRunnerImage,
            python3: options.k8sRunnerPyImage
        },
        sequencesRoot: options.k8sSequencesRoot,
        timeout: options.k8sRunnerCleanupTimeout
    }
});

// before here we actually load the host and we have the config imported elsewhere
// so the config is changed before compile time, not in runtime.
require("@scramjet/host").startHost({}, configService.getConfig(), {
    identifyExisting: options.identifyExisting
})
    .catch((e: (Error | HostError) & { exitCode?: number }) => {
        if ((e as HostError).code) {
            const hostError = e as HostError;

            // eslint-disable-next-line no-console
            console.error(`Error occured with code: ${hostError.code}\nData:${inspect(hostError.data)}\n${e.stack}`);
        } else {
            // eslint-disable-next-line no-console
            console.error(e.stack);
        }

        process.exitCode = e.exitCode || 1;
        process.exit();
    });

