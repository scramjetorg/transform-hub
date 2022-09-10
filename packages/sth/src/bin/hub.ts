#!/usr/bin/env ts-node

import { Command, OptionValues } from "commander";
import { ConfigService, getRuntimeAdapterOption } from "@scramjet/sth-config";
import { DeepPartial, STHCommandOptions, STHConfiguration } from "@scramjet/types";
import { resolve } from "path";
import { HostError } from "@scramjet/model";
import { inspect } from "util";
import { Host } from "@scramjet/host";
import { readConfigFile } from "@scramjet/utility";

const program = new Command();
const options: OptionValues & STHCommandOptions = program
    .option("-c, --config <path>", "Specifies path to config")
    .option("-L, --log-level <level>", "Specify log level")
    .option("--no-colors", "Disable colors in output", false)
    .option("-P, --port <port>", "API port")
    .option("-H, --hostname <IP>", "API IP")
    .option("-E, --identify-existing", "Index existing volumes as sequences")
    .option("-C, --cpm-url <host:ip>")
    .option("-I, --id <id>", "The id assigned to this server")
    .option("--runtime-adapter <adapter>", "Determines adapters used for loading and starting sequence. One of 'docker', 'process', 'kubernetes'")
    .option("-X, --exit-with-last-instance", "Exits host when no more instances exist.")
    .option("-S, --startup-config <path>", "Only works with process adapter. The configuration of startup sequences.")
    .option("-D, --sequences-root <path>", "Only works with --runtime-adapter='process' option. Where should ProcessSequenceAdapter save new sequences")
    .option("--no-docker", "Run all the instances on the host machine instead of in docker containers. UNSAFE FOR RUNNING ARBITRARY CODE.", false)
    .option("--instance-lifetime-extension-delay <ms>", "Instance lifetime extension delay in ms")
    .option("--safe-operation-limit <mb>", "Number of MB reserved by the host for safe operation")
    .option("--expose-host-ip <ip>", "Host IP address that the Runner container's port is mapped to.")
    .option("--isp, --instances-server-port <port>", "Port on which server that instances connect to should run.")
    .option("--runner-image <image name>", "Image used by docker runner for Node.js")
    .option("--runner-py-image <image>", "Image used by docker runner for Python")
    .option("--runner-max-mem <mb>", "Maximum mem used by runner")
    .option("--prerunner-image <image name>", "Image used by prerunner")
    .option("--prerunner-max-mem <mb>", "Maximum mem used by prerunner")
    .option("--cpm-ssl-ca-path <path>", "Certificate Authority for self-signed CPM SSL certificates")
    .option("--cpm-id <id>")
    .option("--cpm-max-reconnections <number>", "Maximum reconnection attempts (-1 no limit)")
    .option("--cpm-reconnection-delay <number>", "Time to wait before next reconnection attempt")
    .option("--k8s-namespace <namespace>", "Kubernetes namespace used in Sequence and Instance adapters.")
    .option("--k8s-auth-config-path <path>", "Kubernetes authorization config path. If not supplied the mounted service account will be used.")
    .option("--k8s-sth-pod-host <host>", "Runner needs to connect to STH. This is the host (IP or hostname) that it will try to connect to.")
    .option("--k8s-runner-image <image>", "Runner image spawned in Nodejs Pod.")
    .option("--k8s-runner-py-image <image>", "Runner image spawned in Python Pod.")
    .option("--k8s-sequences-root <path>", "Kubernetes Process Adapter will store sequences here.")
    .option("--k8s-runner-cleanup-timeout <timeout>", "Set timeout for deleting runner Pod after failure in ms")
    .option("--k8s-runner-resources-requests-cpu <cpu_unit>", "Requests CPU for pod in cpu units [1 CPU unit is equivalent to 1 physical CPU core, or 1 virtual core]")
    .option("--k8s-runner-resources-requests-memory <memory>", "Requests memory for pod e.g [128974848, 129e6, 129M,  128974848000m, 123Mi]")
    .option("--k8s-runner-resources-limits-cpu <cpu unit>", "Set limits for CPU  [1 CPU unit is equivalent to 1 physical CPU core, or 1 virtual core]")
    .option("--k8s-runner-resources-limits-memory <memory>", "Set limits for memory e.g [128974848, 129e6, 129M,  128974848000m, 123Mi]")
    .option("--environment-name", "Sets the environment name for telemetry reporting (defaults to SCP_ENVIRONMENT_NAME env var or 'not-set')", process.env.SCP_ENVIRONMENT_NAME)
    .option("--no-telemetry", "Disables telemetry", false)
    .parse(process.argv)
    .opts() as STHCommandOptions;

(async () => {
    const configService = new ConfigService();
    const resolveFile = (path: string) => path && resolve(process.cwd(), path);

    if (options.config) {
        const configContents = await readConfigFile(options.config) as DeepPartial<STHConfiguration>;

        configService.update(configContents);
    }

    configService.update({
        cpmUrl: options.cpmUrl,
        cpmId: options.cpmId,
        cpmSslCaPath: options.cpmSslCaPath,
        cpm: {
            reconnectionDelay: options.cpmReconnectionDelay,
            maxReconnections: options.cpmMaxReconnections
        },
        docker: {
            prerunner: {
                image: options.prerunnerImage,
                maxMem: options.prerunnerMaxMem
            },
            runner: {
                maxMem: options.runnerMaxMem,
                hostIp: options.exposeHostIp
            },
            runnerImages: {
                node: options.runnerImage,
                python3: options.runnerPyImage
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
        sequencesRoot: resolveFile(options.sequencesRoot),
        startupConfig: resolveFile(options.startupConfig),
        identifyExisting: options.identifyExisting,
        exitWithLastInstance: options.exitWithLastInstance,
        safeOperationLimit: options.safeOperationLimit,
        logLevel: options.logLevel,
        logColors: options.colors,
        kubernetes: {
            namespace: options.k8sNamespace,
            authConfigPath: options.k8sAuthConfigPath,
            sthPodHost: options.k8sSthPodHost,
            runnerImages: {
                node: options.k8sRunnerImage,
                python3: options.k8sRunnerPyImage
            },
            sequencesRoot: resolveFile(options.k8sSequencesRoot),
            timeout: options.k8sRunnerCleanupTimeout,
            runnerResourcesRequestsCpu: options.k8sRunnerResourcesRequestsCpu,
            runnerResourcesRequestsMemory: options.k8sRunnerResourcesRequestsMemory,
            runnerResourcesLimitsCpu: options.k8sRunnerResourcesLimitsCpu,
            runnerResourcesLimitsMemory: options.k8sRunnerResourcesLimitsMemory
        },
        timings: {
            instanceLifetimeExtensionDelay: options.instanceLifetimeExtensionDelay
        },
        telemetry: {
            status: options.telemetry,
            environment: options.environmentName
        }
    });

    const tips = [
        ["Run Sequences in our cloud.", { "Check it": "out as a beta tester", here: "https://scr.je/join-beta-sth" }],
        ["Now you can run Sequences in the cloud and deploy them to multiple locations simultaneously", { "check the": "beta version", "at-this-link": "https://scr.je/join-beta-sth" }],
        ["You don't need to maintain your own server anymore", { "Check out": "Scramjet Cloud Platform", here: "https://scr.je/join-beta-sth" }]
    ];

    const config = configService.getConfig();

    // before here we actually load the host and we have the config imported elsewhere
    // so the config is changed before compile time, not in runtime.
    return require("@scramjet/host").startHost({}, config)
        .then(async (host: Host) => {
            const [message, extra] = tips[~~(Math.random() * 100 * tips.length) % tips.length] as [string, object];

            host.logger.info(message, extra);

            // Host..main is done, so we can now wait until all sequences exited.
            // If no sequences started, we exit as well...
            if (options.exitWithLastInstance) {
                if (Object.keys(host.instancesStore).length === 0) {
                    process.exit(101);
                }

                // TODO: fix this up once heartbeats are up
                const interval = setInterval(async () => {
                    if (Object.keys(host.instancesStore).length === 0) {
                        clearInterval(interval);
                        try {
                            await host.stop();
                        } catch {
                            process.exit(1);
                        }
                    }
                }, 250);
            }

            if (config.telemetry.status) {
                host.logger.info("Telemetry is active. If you don't want to send anonymous telemetry data use '--no-telemetry' when starting STH or set it in the config file.");
            }
        });
})()
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
