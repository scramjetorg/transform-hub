#!/usr/bin/env ts-node

import {
    ConfigOptionDescriptor,
    createOptionRegistry,
    isHelpRequested,
    loadConfig,
    parseCliOptions,
    printHelpAndExitIfRequested,
    sthOutboundVerser2ConfigSchema,
    sthOutboundVerser2Options,
    z,
    ConfigService,
    getRuntimeAdapterOption,
    applyManagerConnectionBundle,
    decodeVerser2ConnectionBundle
} from "@scramjet/config";
import { DeepPartial, StorageAdapterType } from "@scramjet/runtime-types";
import { STHCommandOptions, STHConfiguration } from "@scramjet/api-types";
import { dirname, resolve, join } from "path";
import { mkdirSync, writeFileSync } from "fs";
import { HostError } from "@scramjet/model";
import { inspect } from "util";
import { getValidStorageAdapters, Host, validateSthRunnerPortCollisions, resolveStableHostId, deriveSthRunnerVerser2HostIdentity, createSthRunnerVerser2HostId } from "@scramjet/host";
import { FileBuilder, processCommanderRunnerEnvs } from "@scramjet/utility";
import { constants } from "os";
import { augmentOptions, registerRuntimeAdapterOption } from "@scramjet/adapters";
import { logColorsConfig, logColorsOption, runnerLogConfig, runnerLogForwardingOption } from "../log-options";

const stringToIntSanitizer = (str: string) => {
    const parsedValue = parseInt(str, 10);

    if (Number.isNaN(parsedValue)) {
        throw new Error(`Unable to parse string: ${str} to integer`);
    }
    return parsedValue;
};

const commonOptions: ConfigOptionDescriptor[] = [
    { name: "description", flag: "description", short: "desc", type: "string", description: "Specify sth description" },
    { name: "customName", flag: "custom-name", type: "string", description: "Specify custom name" },
    { name: "tags", flag: "tags", type: "string", description: 'Specifies tags in the format "tag1, tag2"', defaultValue: "" },
    { name: "config", flag: "config", short: "c", type: "string", description: "Specifies path to config" },
    { name: "logLevel", flag: "log-level", short: "L", type: "string", description: "Specify log level" },
    runnerLogForwardingOption,
    logColorsOption,
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
    {
        name: "sequencesRoot",
        flag: "sequences-root",
        short: "D",
        type: "string",
        description: "Works with --runtime-adapter='process' or --runtime-adapter='kubernetes' options. Specifies a location where the Sequence Adapter saves new Sequences."
    },
    { name: "runnerDebug", flag: "runner-debug", type: "boolean", description: "Runners are spawned with debuggers" },
    { name: "docker", flag: "docker", type: "boolean", description: "Use docker runtime adapter shorthand", defaultValue: true, negatable: true },
    { name: "instanceLifetimeExtensionDelay", flag: "instance-lifetime-extension-delay", type: "number", description: "Instance lifetime extension delay in ms" },
    { name: "safeOperationLimit", flag: "safe-operation-limit", type: "number", description: "Number of MB reserved by the host for safe operation", parse: stringToIntSanitizer },
    { name: "exposeHostIp", flag: "expose-host-ip", type: "string", description: "Host IP address that the Runner container's port is mapped to." },
    { name: "instancesServerPort", flag: "instances-server-port", short: "isp", type: "string", description: "Port on which server that instances connect to should run." },
    { name: "cpmId", flag: "cpm-id", type: "string" },
    { name: "cpmMaxReconnections", flag: "cpm-max-reconnections", type: "number", description: "Maximum reconnection attempts (-1 no limit)" },
    { name: "cpmReconnectionDelay", flag: "cpm-reconnection-delay", type: "number", description: "Time to wait before next reconnection attempt" },
    {
        name: "environmentName",
        flag: "environment-name",
        type: "string",
        description: "Sets the environment name for telemetry reporting (defaults to SCP_ENV_VALUE env var or 'not-set')"
    },
    { name: "telemetry", flag: "telemetry", type: "boolean", description: "Enables telemetry" },
    { name: "federationControl", flag: "federation-control", type: "boolean", description: "Enables federation control", negatable: true },
    { name: "healtzPort", flag: "healtz-port", type: "string", description: "Starts monitoring sever on a selected port" },
    { name: "healtzHost", flag: "healtz-host", type: "string", description: 'Starts monitoring sever on a specified interface e.g ["0.0.0.0"]. Requires --healtz-port' },
    { name: "healtzPath", flag: "healtz-path", type: "string", description: "Exposes monitoring endpoint on specified path. Requires --healtz-port" },
    { name: "runnerEnvs", flag: "runner-envs", type: "string", description: "Additional ENVs for Runners. e.g ENV1=1;ENV2=2" },
    { name: "couchdbUrl", flag: "couchdb-url", type: "string", description: "URL to CouchDB localStorage instance" },
    { name: "couchdbName", flag: "couchdb-name", type: "string", description: "CouchDB database name" },
    { name: "couchdbUser", flag: "couchdb-user", type: "string", description: "CouchDB user" },
    { name: "couchdbPass", flag: "couchdb-pass", type: "string", description: "CouchDB password" },
    { name: "localStoragePath", flag: "localstorage-path", type: "string", description: "Storage path for file-based localStorage adapter" },
    { name: "strictPlatformConnection", flag: "strict-platform-connection", type: "boolean", description: "Strictly check platform connection" },
    ...sthOutboundVerser2Options
];

function validatePort(value: unknown, name: string): void {
    if (value === undefined || value === null) return;
    const port = typeof value === "number" ? value : Number.NaN;
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`${name} must be an integer between 1 and 65535`);
}

const createBaseRegistry = () => {
    const registry = createOptionRegistry();

    commonOptions.forEach((option) => registry.option(option));
    registerRuntimeAdapterOption(registry);
    registry.option({
        name: "localStorageAdapter",
        flag: "localstorage-adapter",
        type: "string",
        description: `LocalStorage adapter to use (${getValidStorageAdapters().map((x) => JSON.stringify(x))},"file")`,
        choices: getValidStorageAdapters()
    });

    return registry;
};

const runtimeAdapterHelpOption = (argv: readonly string[]) => {
    const valid = new Set(["detect", "process", "docker", "kubernetes"]);

    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        const value = token.startsWith("--runtime-adapter=") ? token.slice("--runtime-adapter=".length) : token === "--runtime-adapter" || token === "-a" ? argv[i + 1] : undefined;

        if (value && valid.has(value)) return value;
    }

    return "detect";
};

const helpRequested = isHelpRequested(process.argv);
const preliminaryOptions = helpRequested
    ? {}
    : (parseCliOptions({
          argv: process.argv,
          options: createBaseRegistry().getOptions()
      }) as Partial<STHCommandOptions>);

const finalRegistry = augmentOptions(
    createBaseRegistry(),
    helpRequested ? runtimeAdapterHelpOption(process.argv) : getRuntimeAdapterOption(preliminaryOptions as STHCommandOptions) || "detect"
);

printHelpAndExitIfRequested(process.argv, {
    name: "sth",
    usage: "[options...]",
    description: "Start Scramjet Transform Hub.",
    options: finalRegistry.getOptions()
});

const options = parseCliOptions({ argv: process.argv, options: finalRegistry.getOptions() }) as Partial<STHCommandOptions> as STHCommandOptions;

(async () => {
    const configService = new ConfigService();
    const verser2Defaults = JSON.parse(JSON.stringify(configService.getConfig().verser2));
    const resolveFile = (path: string) => path && resolve(process.cwd(), path);
    const configContents = options.config ? FileBuilder(options.config).read() as DeepPartial<STHConfiguration> & { manager?: { connectionBundle?: unknown } } : undefined;

    const verser2 = loadConfig<{ verser2: STHConfiguration["verser2"] }>({
        schema: z.object({ verser2: sthOutboundVerser2ConfigSchema }).passthrough() as z.ZodType<{ verser2: STHConfiguration["verser2"] }>,
        defaults: { verser2: configService.getConfig().verser2 },
        configFilePath: options.config,
        env: process.env,
        cli: options as unknown as Record<string, unknown>,
        options: sthOutboundVerser2Options
    }).config.verser2;

    // Validate the two independently configured ingress forms before the
    // shorthand apiPort is materialised into controlIngress.
    if (verser2.apiPort !== undefined && configContents?.verser2?.controlIngress?.enabled) {
        validateSthRunnerPortCollisions(verser2.apiPort, undefined, configContents.verser2.controlIngress as any);
    }

    validatePort(verser2.apiPort, "verser2-api-port");

    if (options.config) {
        const configFile = FileBuilder(options.config);

        if (!(configFile.exists() && configFile.isReadable())) throw new Error("Unable to read config file");
        const fileContents = configFile.read() as DeepPartial<STHConfiguration>;

        if (fileContents.startupConfig && !options.startupConfig && typeof fileContents.startupConfig === "string") {
            (fileContents as any).startupConfig = resolve(dirname(resolve(process.cwd(), options.config)), fileContents.startupConfig);
        }

        configService.update(fileContents);
    }
    if (options.runnerEnvs) {
        configService.update({ runnerEnvs: processCommanderRunnerEnvs(options.runnerEnvs) });
    }

    if (options.tags?.length) {
        configService.update({ tags: options.tags.split(",") });
    }

    if (!configService.getConfig().tags?.every((t: string) => t.length)) {
        throw new Error("Tags cannot be empty");
    }
    configService.update({
        description: options.description,
        customName: options.customName,
        cpmUrl: options.cpmUrl,
        cpmId: options.cpmId,
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
            federationControl: options.federationControl,
            legacyApiEnabled: options.port !== undefined || configContents?.host?.port !== undefined
        },
        runtimeAdapter: getRuntimeAdapterOption(options),
        localStorageAdapter: options.localStorageAdapter as StorageAdapterType,
        localStoragePath: resolveFile(options.localStoragePath),
        sequencesRoot: resolveFile(options.sequencesRoot),
        ...(options.startupConfig ? { startupConfig: resolveFile(options.startupConfig) } : {}),
        identifyExisting: options.identifyExisting,
        killOnExit: options.killOnExit,
        exitWithLastInstance: options.exitWithLastInstance,
        safeOperationLimit: options.safeOperationLimit,
        logLevel: options.logLevel,
        ...(logColorsConfig(options.colors) || {}),
        ...(runnerLogConfig(options.logForwardRunner) || {}),
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
            sequencesRoot: options.sequencesRoot ? resolveFile(options.sequencesRoot) : resolveFile(options.k8sSequencesRoot),
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
        monitorgingServer:
            options.healtzPort || options.healtzHost || options.healtzPath
                ? {
                      port: options.healtzPort ? parseInt(options.healtzPort, 10) : undefined,
                      host: options.healtzHost,
                      path: options.healtzPath
                  }
                : undefined,
        couchdb: {
            url: options.couchdbUrl,
            dbName: options.couchdbName,
            user: options.couchdbUser,
            pass: options.couchdbPass
        },
        strictPlatformConnection: options.strictPlatformConnection,
        verser2: {
            ...verser2,
            ...(!verser2.apiPort && !configContents?.verser2?.controlIngress ? {
                controlIngress: { ...verser2.controlIngress, enabled: false }
            } : {}),
            ...(verser2.apiPort ? {
                controlIngress: {
                    ...(verser2.controlIngress || {}),
                    enabled: true,
                    generatedApiPort: true,
                    host: {
                        ...(verser2.controlIngress?.host || {}),
                        bindHost: "127.0.0.1",
                        bindPort: verser2.apiPort,
                        publicUrl: `https://127.0.0.1:${verser2.apiPort}`,
                        tls: { ...(verser2.controlIngress?.host?.tls || {}), mtlsRequired: true }
                    }
                }
            } : {})
        }
    });

    await configService.selectRuntimeAdapter();

    let config = configService.getConfig();
    if (config.manager?.connectionBundle || config.manager?.binding) {
        const logger = { info: () => undefined, warn: () => undefined, error: () => undefined };
        const hostId = resolveStableHostId(config.host.id, config.host.infoFilePath || "/tmp/sth-id.json", logger);
        config.host.id = hostId;
        const runnerIdentity = deriveSthRunnerVerser2HostIdentity(config.verser2.runnerHost, hostId);
        const federationHost = createSthRunnerVerser2HostId(runnerIdentity);
        config = applyManagerConnectionBundle(config, verser2Defaults, federationHost);
        const bundle = config.manager?.connectionBundle && decodeVerser2ConnectionBundle(config.manager.connectionBundle);
        if (bundle) {
            const identityDir = resolve(process.cwd(), config.verser2.runnerHost?.identityDir || ".scramjet");
            mkdirSync(identityDir, { recursive: true, mode: 0o700 });
            const caFile = join(identityDir, `manager-ca-${bundle.trust.sha256Fingerprint}.pem`);
            writeFileSync(caFile, bundle.trust.caPem, { mode: 0o644 });
            config.verser2.tls.caFile = caFile;
            configService.update({ verser2: config.verser2 });
        }
    }

    // before here we actually load the host and we have the config imported elsewhere
    // so the config is changed before compile time, not in runtime.
    return require("@scramjet/host")
        .startHost(
            {
                verbose: ["DEBUG", "TRACE"].includes(config.logLevel)
            },
            config
        )
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
})().catch((e: (Error | HostError) & { exitCode?: number }) => {
    if ((e as HostError).code) {
        const hostError = e as HostError;

        console.error(`Error occured with code: ${hostError.code}\nData:${inspect(hostError.data)}\n${e.stack}`);
    } else {
        console.error(e.stack);
    }

    process.exitCode = e.exitCode || 1;
    process.exit();
});
