import { loadConfig, managerVerser2ConfigSchema, managerVerser2Options, maskConfig, z } from "@scramjet/config";
import { ReadOnlyConfig, isLogLevel, merge } from "@scramjet/utility";
import { LoadCheckRequirements } from "@scramjet/types";
import { MultiManagerCommandOptions, MultiManagerOptions } from "../types/multi-manager-types";
import { MultiManagerServerConfig } from "./multi-manager-server-configuration";
import { LoadCheckConfig } from "@scramjet/load-check";
import { homedir } from "os";

const DEFAULT_BUCKET_SPACE_QUOTA = 5 * 1024 * 1024 * 1024;
const defaultMultiManagerConfig: MultiManagerOptions = {
    logLevel: "TRACE",
    logColors: true,
    id: "",
    server: {
        apiBase: "/api",
        apiPort: 11000,
        apiHost: "0.0.0.0",
        version: "v1"
    },
    instanceRequirements: {
        freeMem: 32,
        cpuLoad: 10,
        freeSpace: 64,
    },
    fsPaths: [homedir()],
    safeOperationLimit: 64,
    s3: {
        endPoint: "",
        accessKey: "",
        secretKey: "",
        bucket: "",
        port: 9000,
        useSSL: false,
        region: "",
        bucketLimit: DEFAULT_BUCKET_SPACE_QUOTA
    },
    verser2: {
        enabled: false,
        migrationMode: "verser2",
        host: {
            bindHost: "0.0.0.0",
            bindPort: 0,
            publicUrl: "",
            tls: {
                mtlsRequired: false
            }
        },
        registration: {
            allowLocalPeers: true,
            allowedClientFingerprints: []
        },
        localBroker: {
            peerId: "multimanager.default.broker",
            routeDomain: "multimanager.default.scramjet.internal"
        },
        localGuest: {
            peerId: "multimanager.default.guest",
            routeDomain: "multimanager.default.scramjet.internal"
        },
        timeouts: {
            routeReadinessMs: 10_000,
            leaseAcquireMs: 10_000,
            requestMs: 30_000
        },
        leases: {
            minimumWaitingLeases: 1
        }
    }
};

export const multiManagerCliOptions = [
    { name: "colors", path: "logColors", type: "boolean" as const },
    { name: "id", path: "id", type: "string" as const },
    { name: "serverApiBase", path: "server.apiBase", type: "string" as const },
    { name: "serverApiPort", path: "server.apiPort", type: "number" as const },
    { name: "serverApiHost", path: "server.apiHost", type: "string" as const },
    { name: "serverVersion", path: "server.version", type: "string" as const },
    { name: "logLevel", path: "logLevel", type: "string" as const },
    { name: "manager", path: "manager", type: "json" as const },
    { name: "healtzPort", path: "monitoringServer.port", type: "number" as const },
    { name: "healtzHost", path: "monitoringServer.host", type: "string" as const },
    { name: "healtzPath", path: "monitoringServer.path", type: "string" as const },
    ...managerVerser2Options
];

const multiManagerConfigSchema = z.object({
    logLevel: z.string(),
    logColors: z.boolean(),
    id: z.string(),
    server: z.object({
        apiBase: z.string(),
        apiPort: z.number(),
        apiHost: z.string(),
        version: z.string()
    }).strict(),
    manager: z.any().optional(),
    instanceRequirements: z.object({
        freeMem: z.number(),
        cpuLoad: z.number(),
        freeSpace: z.number()
    }).strict(),
    fsPaths: z.array(z.string()),
    safeOperationLimit: z.number(),
    s3: z.object({
        endPoint: z.string(),
        accessKey: z.string(),
        secretKey: z.string(),
        bucket: z.string(),
        port: z.number(),
        useSSL: z.boolean(),
        region: z.string(),
        bucketLimit: z.number()
    }).strict(),
    monitoringServer: z.object({
        port: z.number().optional(),
        host: z.string().optional(),
        path: z.string().optional()
    }).partial().optional(),
    verser2: managerVerser2ConfigSchema
}).strict();

const cliConfig = (options: MultiManagerCommandOptions): Record<string, unknown> => {
    const cli = { ...options } as Record<string, unknown>;

    delete cli.config;
    delete cli.dumpHeap;
    delete cli.sslKeyPath;
    delete cli.sslCertPath;
    if (cli.colors === true) delete cli.colors;

    return cli;
};

export class MultiManagerConfig extends ReadOnlyConfig<MultiManagerOptions> {
    constructor(options: MultiManagerCommandOptions, env: Record<string, string | undefined> = process.env) {
        const multiManagerConfig = loadConfig<MultiManagerOptions>({
            schema: multiManagerConfigSchema as unknown as z.ZodType<MultiManagerOptions>,
            defaults: defaultMultiManagerConfig as unknown as Record<string, unknown>,
            configFilePath: options.config,
            env,
            cli: cliConfig(options),
            options: multiManagerCliOptions
        }).config;

        super(multiManagerConfig);
    }

    get logLevel() { return this.configuration.logLevel; }
    get logColors() { return this.configuration.logColors; }
    get id() { return this.configuration.id; }
    get server() { return this.configuration.server; }
    get manager() { return this.configuration.manager; }
    get verser2() { return this.configuration.verser2; }
    get loadCheckRequirements(): LoadCheckRequirements {
        const { safeOperationLimit, instanceRequirements, fsPaths } = this.configuration;

        return { safeOperationLimit, instanceRequirements, fsPaths };
    }
    get s3() { return this.configuration.s3; }
    get monitoringServer() { return this.configuration.monitoringServer; }

    _maskValue(value: string, regex: RegExp = /(?<=.{2}).+/, mask = "X") {
        return value.replace(regex, mask.padEnd(value.length - 2, "X"));
    }

    getMasked(): MultiManagerOptions {
        const config = { s3: {} } as Partial<MultiManagerOptions>;

        merge(config, this.configuration);

        if (config.s3) {
            config.s3.accessKey = this._maskValue(config.s3.accessKey);
            config.s3.secretKey = this._maskValue(config.s3.secretKey);
            config.s3.bucket = this._maskValue(config.s3.bucket);
            config.s3.endPoint = this._maskValue(config.s3.endPoint);
            config.s3.region = this._maskValue(config.s3.region);
        }

        return maskConfig(config, multiManagerCliOptions) as MultiManagerOptions;
    }

    protected validateEntry(key: string, value: any): boolean | null {
        return MultiManagerConfig.validateEntry(key, value);
    }

    static validateEntry(key: string, value: any): boolean | null {
        switch (key) {
            case "logLevel":
                return isLogLevel(value);
            case "logColors":
                return typeof value === "boolean";
            case "id":
                return null;
            case "server":
                return new MultiManagerServerConfig(value).isValid();
            case "manager":
                if (value === undefined) return null;
                return true;
            case "safeOperationLimit":
            case "instanceRequirements":
                return LoadCheckConfig.validateEntry(key, value);
            default:
                return null;
        }
    }
}
