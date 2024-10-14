#!/usr/bin/env ts-node
/* eslint-disable complexity */

import { Command, Option, OptionValues } from "commander";
import { ConfigService, getRuntimeAdapterOption } from "@scramjet/sth-config";
import { DeepPartial, STHCommandOptions, STHConfiguration } from "@scramjet/types";
import { resolve } from "path";
import { HostError } from "@scramjet/model";
import { inspect } from "util";
import { Host } from "@scramjet/host";
import { FileBuilder, processCommanderRunnerEnvs } from "@scramjet/utility";
import { constants } from "os";
import { augmentOptions } from "@scramjet/adapters";

const stringToIntSanitizer = (str : string) => {
    const parsedValue = parseInt(str, 10);

    if (Number.isNaN(parsedValue)) {
        throw new Error(`Unable to parse string: ${str} to integer`);
    }
    return parsedValue;
};

const program = new Command();
const unaugmentedOptions = program
    .option("-desc, --description <description>", "Specify sth description")
    .option("--custom-name <customName>", "Specify custom name")
    .option("--tags <tags>", "Specifies tags in the format \"tag1, tag2\"", "")
    .option("-c, --config <path>", "Specifies path to config")
    .option("-L, --log-level <level>", "Specify log level")
    .option("--no-colors", "Disable colors in output", false)
    .option("-P, --port <port>", "API port")
    .option("-H, --hostname <IP>", "API IP")
    .option("-E, --identify-existing", "Index existing volumes as sequences")
    .option("-C, --cpm-url <host:ip>")
    .option("-K, --kill-on-exit", "Kills all instances on exit")
    .option("--platform-api <url>", "Platform API url, ie. https://api.scramjet.org/api/v1")
    .option("--platform-api-version <version>", "Platform API version", "v1")
    .option("--platform-api-key <string>", "Platform API Key")
    .option("--platform-space <orgId:spaceId>", "Target Platform Space")
    .option("-I, --id <id>", "The id assigned to this server")
    .option("-X, --exit-with-last-instance", "Exits host when no more instances exist.")
    .option("-S, --startup-config <path>", "Only works with process adapter. The configuration of startup sequences.")
    .option("-D, --sequences-root <path>", "Works with --runtime-adapter='process' or --runtime-adapter='kubernetes' options. Specifies a location where the Sequence Adapter saves new Sequences.")
    .option("--debug", "Runners are spawned with debuggers", false)
    .option("--no-docker", "Run all the instances on the host machine instead of in docker containers. UNSAFE FOR RUNNING ARBITRARY CODE.", false)
    .option("--instance-lifetime-extension-delay <ms>", "Instance lifetime extension delay in ms")
    .addOption(new Option("--safe-operation-limit <mb>", "Number of MB reserved by the host for safe operation").argParser(stringToIntSanitizer))
    .option("--expose-host-ip <ip>", "Host IP address that the Runner container's port is mapped to.")
    .option("--isp, --instances-server-port <port>", "Port on which server that instances connect to should run.")
    .option("--cpm-ssl-ca-path <path>", "Certificate Authority for self-signed CPM SSL certificates")
    .option("--cpm-id <id>")
    .option("--cpm-max-reconnections <number>", "Maximum reconnection attempts (-1 no limit)")
    .option("--cpm-reconnection-delay <number>", "Time to wait before next reconnection attempt")
    .option("--environment-name <name>", "Sets the environment name for telemetry reporting (defaults to SCP_ENV_VALUE env var or 'not-set')")
    .option("--telemetry", "Enables telemetry", false)
    .option("--enable-federation-control", "Enables federation control", false)
    .option("--healtz-port <healtz-port>", "Starts monitoring sever on a selected port")
    .option("--healtz-host <healtz-host>", "Starts monitoring sever on a specified interface e.g [\"0.0.0.0\"]. Requires --healtz-port")
    .option("--healtz-path <healtz-path>", "Exposes monitoring endpoint on specified path. Requires --healtz-port")
    .option("--runner-envs <runnerEnvs>", "Additional ENVs for Runners. e.g ENV1=1;ENV2=2");

const options = augmentOptions(unaugmentedOptions)
    .parse(process.argv)
    .opts() as OptionValues & STHCommandOptions;

(async () => {
    const configService = new ConfigService();
    const resolveFile = (path: string) => path && resolve(process.cwd(), path);

    if (options.config) {
        const configFile = FileBuilder(options.config);

        if (!(configFile.exists() && configFile.isReadable())) throw new Error("Unable to read config file");
        const configContents = configFile.read() as DeepPartial<STHConfiguration>;

        configService.update(configContents);
    }
    if (options.runnerEnvs) {
        configService.update({ runnerEnvs: processCommanderRunnerEnvs(options.runnerEnvs) });
    }

    if (options.tags.length) {
        configService.update({ tags: options.tags.split(",") });
    }

    if (!configService.getConfig().tags?.every((t:string) => t.length)) {
        throw new Error("Tags cannot be empty");
    }
    configService.update({
        description: options.description,
        customName: options.customName,
        cpmUrl: options.cpmUrl,
        cpmId: options.cpmId,
        cpmSslCaPath: options.cpmSslCaPath,
        cpm: {
            reconnectionDelay: options.cpmReconnectionDelay,
            maxReconnections: options.cpmMaxReconnections
        },
        debug: options.debug,
        platform: {
            apiKey: options.platformApiKey,
            api: options.platformApi,
            space: options.platformSpace,
            apiVersion: options.platformApiVersion
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
            id: options.id,
            federationControl: options.enableFederationControl
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
            quotaName: options.k8sQuotaName,
            namespace: options.k8sNamespace,
            authConfigPath: options.k8sAuthConfigPath,
            sthPodHost: options.k8sSthPodHost,
            runnerImages: {
                node: options.k8sRunnerImage,
                python3: options.k8sRunnerPyImage
            },
            sequencesRoot:
                options.sequencesRoot ? resolveFile(options.sequencesRoot) : resolveFile(options.k8sSequencesRoot),
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
            environment: options.environmentName || process.env.SCP_ENV_VALUE || "not-set"
        },
        monitorgingServer: options.healtzPort || options.healtzHost || options.healtzPath ? {
            port: parseInt(options.healtzPort, 10),
            host: options.healtzHost,
            path: options.healtzPath
        } : undefined
    });

    const tips = [
        ["Run Sequences in our cloud.", { "Find out": "more about Scramjet Cloud Platform", here: "https://scramjet.org/" }],
        ["Now you can run Sequences in the cloud and deploy them to multiple locations simultaneously", { "Sign up": "and start your 30-day trial for free!", here: "https://console.scramjet.cloud" }],
        ["You don't need to maintain your own server anymore", { "Check out": "Scramjet Cloud Platform", here: "https://scramjet.org/" }]
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

            if (options.killOnExit) {
                let killing = false;
                const kill = (signal: NodeJS.Signals) => {
                    if (killing) return process.exit(constants.signals[signal]);
                    killing = true;

                    host.logger.warn("Kill on exit is enabled. Killing all instances and exiting.");
                    host.stop()
                        .then(() => {
                            host.logger.info("All instances killed. Exiting.");
                            process.exit(constants.signals[signal]);
                        }, (e) => {
                            host.logger.error("Error killing instances", e);
                            process.exit(constants.signals[signal]);
                        });

                    return undefined;
                };

                process.on("SIGINT", kill);
                process.on("SIGTERM", kill);
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

