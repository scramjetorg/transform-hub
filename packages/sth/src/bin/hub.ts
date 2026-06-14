#!/usr/bin/env ts-node
/* eslint-disable complexity */

import { ConfigOptionDescriptor, createOptionRegistry, parseCliOptions } from "@scramjet/config";
import { ConfigService, getRuntimeAdapterOption } from "@scramjet/sth-config";
import { DeepPartial, STHCommandOptions, STHConfiguration, StorageAdapterType } from "@scramjet/types";
import { resolve } from "path";
import { HostError } from "@scramjet/model";
import { inspect } from "util";
import { getValidStorageAdapters, Host } from "@scramjet/host";
import { FileBuilder, processCommanderRunnerEnvs } from "@scramjet/utility";
import { constants } from "os";
import { augmentOptions, registerRuntimeAdapterOption } from "@scramjet/adapters";

const stringToIntSanitizer = (str : string) => {
    const parsedValue = parseInt(str, 10);

    if (Number.isNaN(parsedValue)) {
        throw new Error(`Unable to parse string: ${str} to integer`);
    }
    return parsedValue;
};

const commonOptions: ConfigOptionDescriptor[] = [
    { name: "description", flag: "description", short: "desc", type: "string", description: "Specify sth description" },
    { name: "customName", flag: "custom-name", type: "string", description: "Specify custom name" },
    { name: "tags", flag: "tags", type: "string", description: "Specifies tags in the format \"tag1, tag2\"", defaultValue: "" },
    { name: "config", flag: "config", short: "c", type: "string", description: "Specifies path to config" },
    { name: "logLevel", flag: "log-level", short: "L", type: "string", description: "Specify log level" },
    { name: "colors", flag: "colors", type: "boolean", description: "Enable colors in output", defaultValue: true },
    { name: "port", flag: "port", short: "P", type: "number", description: "API port" },
    { name: "hostname", flag: "hostname", short: "H", type: "string", description: "API IP" },
    { name: "identifyExisting", flag: "identify-existing", short: "E", type: "boolean", description: "Index existing volumes as sequences" },
    { name: "cpmUrl", flag: "cpm-url", short: "C", type: "string" },
    { name: "instanceReconnect", flag: "instance-reconnect", short: "R", type: "boolean", description: "Signal runners to attempt to reconnect" },
    { name: "killOnExit", flag: "kill-on-exit", short: "K", type: "boolean", description: "Kills all instances on exit" },
    { name: "platformApi", flag: "platform-api", type: "string", description: "Platform API url, ie. https://api.scramjet.org/api/v1" },
    { name: "platformApiVersion", flag: "platform-api-version", type: "string", description: "Platform API version", defaultValue: "v1" },
    { name: "platformApiKey", flag: "platform-api-key", type: "string", description: "Platform API Key" },
    { name: "platformSpace", flag: "platform-space", type: "string", description: "Target Platform Space" },
    { name: "id", flag: "id", short: "I", type: "string", description: "The id assigned to this server" },
    { name: "exitWithLastInstance", flag: "exit-with-last-instance", short: "X", type: "boolean", description: "Exits host when no more instances exist." },
    { name: "startupConfig", flag: "startup-config", short: "S", type: "string", description: "Only works with process adapter. The configuration of startup sequences." },
    { name: "sequencesRoot", flag: "sequences-root", short: "D", type: "string", description: "Works with --runtime-adapter='process' or --runtime-adapter='kubernetes' options. Specifies a location where the Sequence Adapter saves new Sequences." },
    { name: "runnerDebug", flag: "runner-debug", type: "boolean", description: "Runners are spawned with debuggers" },
    { name: "docker", flag: "docker", type: "boolean", description: "Use docker runtime adapter shorthand", defaultValue: true, negatable: true },
    { name: "instanceLifetimeExtensionDelay", flag: "instance-lifetime-extension-delay", type: "number", description: "Instance lifetime extension delay in ms" },
    { name: "safeOperationLimit", flag: "safe-operation-limit", type: "number", description: "Number of MB reserved by the host for safe operation", parse: stringToIntSanitizer },
    { name: "exposeHostIp", flag: "expose-host-ip", type: "string", description: "Host IP address that the Runner container's port is mapped to." },
    { name: "instancesServerPort", flag: "instances-server-port", short: "isp", type: "string", description: "Port on which server that instances connect to should run." },
    { name: "cpmSslCaPath", flag: "cpm-ssl-ca-path", type: "string", description: "Certificate Authority for self-signed CPM SSL certificates" },
    { name: "cpmId", flag: "cpm-id", type: "string" },
    { name: "cpmMaxReconnections", flag: "cpm-max-reconnections", type: "number", description: "Maximum reconnection attempts (-1 no limit)" },
    { name: "cpmReconnectionDelay", flag: "cpm-reconnection-delay", type: "number", description: "Time to wait before next reconnection attempt" },
    { name: "environmentName", flag: "environment-name", type: "string", description: "Sets the environment name for telemetry reporting (defaults to SCP_ENV_VALUE env var or 'not-set')" },
    { name: "telemetry", flag: "telemetry", type: "boolean", description: "Enables telemetry" },
    { name: "federationControl", flag: "federation-control", type: "boolean", description: "Enables federation control", negatable: true },
    { name: "healtzPort", flag: "healtz-port", type: "string", description: "Starts monitoring sever on a selected port" },
    { name: "healtzHost", flag: "healtz-host", type: "string", description: "Starts monitoring sever on a specified interface e.g [\"0.0.0.0\"]. Requires --healtz-port" },
    { name: "healtzPath", flag: "healtz-path", type: "string", description: "Exposes monitoring endpoint on specified path. Requires --healtz-port" },
    { name: "runnerEnvs", flag: "runner-envs", type: "string", description: "Additional ENVs for Runners. e.g ENV1=1;ENV2=2" },
    { name: "couchdbUrl", flag: "couchdb-url", type: "string", description: "URL to CouchDB localStorage instance" },
    { name: "couchdbName", flag: "couchdb-name", type: "string", description: "CouchDB database name" },
    { name: "couchdbUser", flag: "couchdb-user", type: "string", description: "CouchDB user" },
    { name: "couchdbPass", flag: "couchdb-pass", type: "string", description: "CouchDB password" },
    { name: "localStoragePath", flag: "localstorage-path", type: "string", description: "Storage path for file-based localStorage adapter" },
    { name: "strictPlatformConnection", flag: "strict-platform-connection", type: "boolean", description: "Strictly check platform connection" }
];

const createBaseRegistry = () => {
    const registry = createOptionRegistry();

    commonOptions.forEach(option => registry.option(option));
    registerRuntimeAdapterOption(registry);
    registry.option({
        name: "localStorageAdapter",
        flag: "localstorage-adapter",
        type: "string",
        description: `LocalStorage adapter to use (${getValidStorageAdapters().map(x => JSON.stringify(x))},"file")`,
        choices: getValidStorageAdapters()
    });

    return registry;
};

const preliminaryOptions = parseCliOptions({
    argv: process.argv,
    options: createBaseRegistry().getOptions()
}) as Partial<STHCommandOptions>;

const finalRegistry = augmentOptions(createBaseRegistry(), getRuntimeAdapterOption(preliminaryOptions as STHCommandOptions) || "detect");
const options = parseCliOptions({ argv: process.argv, options: finalRegistry.getOptions() }) as Partial<STHCommandOptions> as STHCommandOptions;

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
        instanceReconnect: options.instanceReconnect,
        cpm: {
            reconnectionDelay: options.cpmReconnectionDelay,
            maxReconnections: options.cpmMaxReconnections
        },
        debug: options.runnerDebug,
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
                python3: options.runnerPyImage,
                bun: options.runnerBunImage
            }
        },
        host: {
            apiBase: "/api/v1",
            instancesServerPort: options.instancesServerPort ? parseInt(options.instancesServerPort, 10) : undefined,
            port: options.port,
            hostname: options.hostname,
            id: options.id,
            federationControl: options.federationControl
        },
        runtimeAdapter: getRuntimeAdapterOption(options),
        localStorageAdapter: options.localStorageAdapter as StorageAdapterType,
        localStoragePath: resolveFile(options.localStoragePath),
        sequencesRoot: resolveFile(options.sequencesRoot),
        startupConfig: resolveFile(options.startupConfig),
        identifyExisting: options.identifyExisting,
        killOnExit: options.killOnExit,
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
                python3: options.k8sRunnerPyImage,
                bun: options.k8sRunnerBunImage
            },
            sequencesRoot:
                options.sequencesRoot ? resolveFile(options.sequencesRoot) : resolveFile(options.k8sSequencesRoot),
            timeout: isNaN(+options.k8sRunnerCleanupTimeout) ? 0 : parseInt(options.k8sRunnerCleanupTimeout, 10),
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
            port: options.healtzPort ? parseInt(options.healtzPort, 10) : undefined,
            host: options.healtzHost,
            path: options.healtzPath
        } : undefined,
        couchdb: {
            url: options.couchdbUrl,
            dbName: options.couchdbName,
            user: options.couchdbUser,
            pass: options.couchdbPass
        },
        strictPlatformConnection: options.strictPlatformConnection
    });

    await configService.selectRuntimeAdapter();

    const config = configService.getConfig();

    // before here we actually load the host and we have the config imported elsewhere
    // so the config is changed before compile time, not in runtime.
    return require("@scramjet/host").startHost({
        verbose: ["DEBUG", "TRACE"].includes(config.logLevel),
    }, config)
        .then(async (host: Host) => {
            // Host..main is done, so we can now wait until all sequences exited.
            // If no sequences started, we exit as well...
            if (config.exitWithLastInstance) {
                if (host.instancesStore.length === 0) {
                    process.exit(101);
                }

                // TODO: fix this up once heartbeats are up
                const interval = setInterval(async () => {
                    if (host.instancesStore.length === 0) {
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

            let killing = false;
            const kill = (signal: NodeJS.Signals) => {
                process.removeListener("SIGINT", kill);
                process.removeListener("SIGTERM", kill);

                if (killing) {
                    process.exit(constants.signals[signal]);
                }
                killing = true;

                host.logger.info("Received kill signal, stopping host...");

                host.performStop(constants.signals[signal]);
            };

            process.on("SIGINT", kill);
            process.on("SIGTERM", kill);
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
