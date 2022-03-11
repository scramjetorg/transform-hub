#!/usr/bin/env ts-node

import { Command } from "commander";
import { ConfigService, getRuntimeAdapterOption } from "@scramjet/sth-config";
import { STHCommandOptions } from "@scramjet/types";

const program = new Command();
const options: STHCommandOptions = program
    .option("-L, --log-level <level>", "Specify log level", "trace")
    .option("-P, --port <port>", "API port")
    .option("-H, --hostname <IP>", "API IP")
    .option("-E, --identify-existing", "Index existing volumes as sequences", false)
    .option("-C, --cpm-url <host:ip>")
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
    .option("--k8s-runner-image <image>", "Runner image spawned in Pod.")
    .option("--k8s-sequences-root <path>", "Kuberenetes Process Adapter will store sequences here.")
    .option("--no-docker", "Run all the instances on the host machine instead of in docker containers. UNSAFE FOR RUNNING ARBITRARY CODE.", false)
    .parse(process.argv)
    .opts();

const configService = new ConfigService();

configService.update({
    cpmUrl: options.cpmUrl,
    cpmId: options.cpmId,
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
    sequencesRoot: options.sequencesRoot,
    logLevel: options.logLevel,
    kubernetes: {
        namespace: options.k8sNamespace,
        authConfigPath: options.k8sAuthConfigPath,
        sthPodHost: options.k8sSthPodHost,
        runnerImage: options.k8sRunnerImage,
        sequencesRoot: options.k8sSequencesRoot
    }
});

// before here we actually load the host and we have the config imported elsewhere
// so the config is changed before compile time, not in runtime.
require("@scramjet/host").startHost({}, configService.getConfig(), {
    identifyExisting: options.identifyExisting
})
    .catch((e: Error & { exitCode?: number }) => {
        // eslint-disable-next-line no-console
        console.error(e.stack);
        process.exitCode = e.exitCode || 1;
        process.exit();
    });

